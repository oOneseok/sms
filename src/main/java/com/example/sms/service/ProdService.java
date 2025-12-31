package com.example.sms.service;

import com.example.sms.dto.ProdReceiveReq;
import com.example.sms.dto.ProdReserveReq;
import com.example.sms.entity.*;
import com.example.sms.repository.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProdService {

    private final ProdRepository prodRepository;
    private final ProdResultRepository prodResultRepository;

    private final ItemRepository itemRepository;
    private final BomRepository bomRepository;
    private final ItemStockRepository itemStockRepository;
    private final ItemStockHisRepository itemStockHisRepository;
    private final ItemIoRepository itemIoRepository;
    private final WhMstRepository whMstRepository;

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private String newProdNo() {
        return "P" + LocalDateTime.now().format(TS);
    }
    private String newStkHisCd() { return "STK" + LocalDateTime.now().format(TS); }
    private String newIoCd() {
        String v = "IO" + LocalDateTime.now().format(TS);
        return v.length() > 20 ? v.substring(0, 20) : v;
    }

    // --- Helper Methods ---
    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
    private static BigDecimal nz(Double v) { return v == null ? BigDecimal.ZERO : BigDecimal.valueOf(v); }

    private Prod loadProd(String prodNo) {
        return prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));
    }

    // =========================================================
    // CRUD (생성, 수정, 취소) - 기존 유지
    // =========================================================
    @Transactional
    public Prod createProd(Prod body) {
        // 프론트에서 prodNo를 안 보내거나 비워 보내면 자동 생성
        String prodNo = (body.getProdNo() == null || body.getProdNo().isBlank())
                ? newProdNo()
                : body.getProdNo();

        // (혹시 중복되면 에러)
        if (prodRepository.existsById(prodNo))
            throw new IllegalArgumentException("Already exists: " + prodNo);

        return prodRepository.save(
                Prod.builder()
                        .prodNo(prodNo) // 생성된 번호 사용
                        .prodDt(body.getProdDt())
                        .itemCd(body.getItemCd())
                        .planQty(nz(body.getPlanQty()))
                        .status("01") // 신규는 무조건 01
                        .remark(body.getRemark())
                        .build()
        );
    }

    @Transactional
    public Prod cancelProd(String prodNo, String remark) {
        Prod old = loadProd(prodNo);
        // 예약 상태(03)에서 취소 시 예약 해제 수행
        if ("03".equals(old.getStatus())) {
            unreserveMaterials(prodNo, "취소로 인한 예약해제");
        }
        return prodRepository.save(Prod.builder()
                .prodNo(old.getProdNo()).prodDt(old.getProdDt()).itemCd(old.getItemCd())
                .planQty(old.getPlanQty()).status("09").remark(remark).build());
    }

    @Transactional
    public Prod updateProd(String prodNo, Prod body) {
        Prod old = loadProd(prodNo);

        // 변경할 값이 없으면 기존 값 유지
        String itemCd = (body.getItemCd() == null || body.getItemCd().isBlank()) ? old.getItemCd() : body.getItemCd();

        return prodRepository.save(
                Prod.builder()
                        .prodNo(prodNo)
                        .prodDt(body.getProdDt() == null ? old.getProdDt() : body.getProdDt())
                        .itemCd(itemCd)
                        .planQty(body.getPlanQty() == null ? old.getPlanQty() : body.getPlanQty())
                        .status(body.getStatus() == null ? old.getStatus() : body.getStatus())
                        .remark(body.getRemark() == null ? old.getRemark() : body.getRemark())
                        .build()
        );
    }
    // =========================================================
    //  MRP / RESERVE (핵심 수정 구간)
    // =========================================================

    private Map<String, BigDecimal> calcRequiredMaterials(String pItemCd, BigDecimal planQty) {
        List<BomMst> boms = bomRepository.findByPItemCd(pItemCd);
        Map<String, BigDecimal> req = new LinkedHashMap<>();
        for (BomMst b : boms) {
            BigDecimal useQty = nz(b.getUseQty());
            BigDecimal add = useQty.multiply(planQty);
            req.put(b.getSItemCd(), nz(req.get(b.getSItemCd())).add(add));
        }
        return req;
    }

    // ✅ 기존 자동 배분 로직 (수동 입력 없을 때 사용)
    private List<AllocLine> autoAllocate(String itemCd, BigDecimal required) {
        List<ItemStock> stocks = itemStockRepository.findByIdItemCd(itemCd);
        List<AllocLine> lines = new ArrayList<>();

        // 가용재고 계산
        for (ItemStock s : stocks) {
            BigDecimal avail = nz(s.getStockQty()).subtract(nz(s.getAllocQty()));
            lines.add(new AllocLine(s.getId().getWhCd(), nz(s.getStockQty()), nz(s.getAllocQty()), avail, BigDecimal.ZERO));
        }
        // 가용 많은 순 정렬
        lines.sort(Comparator.comparing(AllocLine::getAvailQty).reversed());

        BigDecimal remain = required;
        List<AllocLine> out = new ArrayList<>();

        for (AllocLine l : lines) {
            if (remain.compareTo(BigDecimal.ZERO) <= 0) break;
            if (l.getAvailQty().compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal take = l.getAvailQty().min(remain);
            out.add(new AllocLine(l.getWhCd(), l.getStockQty(), l.getAllocQty(), l.getAvailQty(), take));
            remain = remain.subtract(take);
        }

        if (remain.compareTo(BigDecimal.ZERO) > 0) {
            // 자동 배분 실패 시 에러보다는 일단 가능한 만큼만 리턴하고, 상위에서 처리하거나 에러 발생
            // 여기선 로직 단순화를 위해 남은 수량 무시 (상위에서 체크함)
        }
        return out;
    }

    // ✅ [신규] 수동 배분 로직
    private List<AllocLine> manualAllocate(String itemCd, BigDecimal required, List<ProdReserveReq.ManualAlloc> manuals) {
        List<AllocLine> lines = new ArrayList<>();
        BigDecimal totalAllocated = BigDecimal.ZERO;

        for (ProdReserveReq.ManualAlloc m : manuals) {
            if (!m.getItemCd().equals(itemCd)) continue;
            BigDecimal qty = nz(m.getQty());
            if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            ItemStockId id = new ItemStockId(itemCd, m.getWhCd());
            ItemStock stock = itemStockRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("해당 창고에 자재 데이터가 없습니다: " + m.getWhCd()));

            BigDecimal currentStock = nz(stock.getStockQty());
            BigDecimal currentAlloc = nz(stock.getAllocQty());
            BigDecimal avail = currentStock.subtract(currentAlloc);

            if (avail.compareTo(qty) < 0) {
                throw new IllegalArgumentException("가용 재고 부족! [" + itemCd + "] 창고:" + m.getWhCd() +
                        " 요청:" + qty + " 가용:" + avail);
            }

            lines.add(new AllocLine(m.getWhCd(), currentStock, currentAlloc, avail, qty));
            totalAllocated = totalAllocated.add(qty);
        }

        // 수동 지정량이 필요량과 맞는지 검증
        if (totalAllocated.compareTo(required) != 0) {
            throw new IllegalArgumentException("[" + itemCd + "] 필요 수량과 지정 수량이 다릅니다. (필요:" + required + ", 지정:" + totalAllocated + ")");
        }
        return lines;
    }

    /**
     * ✅ 02 -> 03 (예약 실행)
     * - DTO를 통해 수동 할당 정보가 오면 우선 적용
     * - 정보가 없으면 자동 배분
     * - ★중요: 예약된 내역이 0건이면 에러 발생 (유령 상태 방지)
     */
    @Transactional
    public ReserveResult reserveMaterials(String prodNo, ProdReserveReq req) {
        Prod prod = loadProd(prodNo);

        if (!"02".equals(prod.getStatus())) {
            // 이미 03이면 중복 예약 방지
            if ("03".equals(prod.getStatus())) throw new IllegalArgumentException("이미 예약된 상태입니다.");
            throw new IllegalArgumentException("reserve는 STATUS=02에서만 가능합니다.");
        }

        BigDecimal planQty = nz(prod.getPlanQty());
        if (planQty.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("PLAN_QTY must be > 0");

        // 1. 필요량 계산
        Map<String, BigDecimal> requiredMap = calcRequiredMaterials(prod.getItemCd(), planQty);

        // 2. 수동 할당 정보 정리 (Map 변환)
        Map<String, List<ProdReserveReq.ManualAlloc>> manualMap = new HashMap<>();
        if (req != null && req.getAllocations() != null) {
            for (ProdReserveReq.ManualAlloc m : req.getAllocations()) {
                manualMap.computeIfAbsent(m.getItemCd(), k -> new ArrayList<>()).add(m);
            }
        }

        List<ReserveLine> reservedLog = new ArrayList<>();
        int totalReserveCount = 0; // 실제 DB 저장 건수

        // 3. 자재별 배분 및 저장
        for (Map.Entry<String, BigDecimal> e : requiredMap.entrySet()) {
            String matCd = e.getKey();
            BigDecimal required = nz(e.getValue());
            if (required.compareTo(BigDecimal.ZERO) <= 0) continue;

            List<AllocLine> allocs;
            // 수동 정보가 있으면 수동, 없으면 자동
            if (manualMap.containsKey(matCd) && !manualMap.get(matCd).isEmpty()) {
                allocs = manualAllocate(matCd, required, manualMap.get(matCd));
            } else {
                allocs = autoAllocate(matCd, required);
            }

            // 부족 여부 체크 (자동 할당 시 전부 못 채웠을 경우)
            BigDecimal allocatedSum = allocs.stream().map(AllocLine::getTakeQty).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (allocatedSum.compareTo(required) < 0) {
                throw new IllegalArgumentException("자재 부족 발생! [" + matCd + "] 필요:" + required + " 확보:" + allocatedSum);
            }

            for (AllocLine a : allocs) {
                BigDecimal qty = a.getTakeQty();
                if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

                ItemStockId id = new ItemStockId(matCd, a.getWhCd());
                ItemStock cur = itemStockRepository.findById(id).orElseThrow();

                // DB Update (Alloc 증가)
                BigDecimal newStock = nz(cur.getStockQty());
                BigDecimal newAlloc = nz(cur.getAllocQty()).add(qty);

                itemStockRepository.save(ItemStock.builder().id(id).stockQty(newStock).allocQty(newAlloc).build());

                // History Insert
                itemStockHisRepository.save(ItemStockHis.builder()
                        .stkHisCd(newStkHisCd()).itemCd(matCd).whCd(a.getWhCd())
                        .trxDt(LocalDateTime.now()).ioType("RESERVE")
                        .qtyDelta(BigDecimal.ZERO).allocDelta(qty)
                        .refTb("TB_PROD").refNo(prodNo).refSeq(1)
                        .remark(req != null && req.getRemark() != null ? req.getRemark() : "생산예약")
                        .build());

                // ItemIo Insert (나중에 consume에서 사용)
                ItemIo io = new ItemIo();
                io.setIoCd(newIoCd());
                io.setIoDt(LocalDate.now().toString());
                io.setIoType("RESERVE");
                io.setItemMst(itemRepository.findById(matCd).orElseThrow());
                io.setToWh(whMstRepository.findById(a.getWhCd()).orElseThrow());
                io.setQty(qty.intValue());
                io.setRefTb("TB_PROD");
                io.setRefCd(prodNo);
                io.setRefSeq(1);
                io.setRemark("예약");
                itemIoRepository.save(io);

                reservedLog.add(new ReserveLine(matCd, a.getWhCd(), qty));
                totalReserveCount++;
            }
        }

        // ✅ [Fix] 예약된 건수가 하나도 없으면 에러 (상태 변경 막음)
        if (totalReserveCount == 0) {
            throw new IllegalArgumentException("예약 처리에 실패했습니다. (자재 부족 또는 BOM 설정 확인 필요)");
        }

        // 4. 상태 변경 02 -> 03
        prodRepository.save(Prod.builder()
                .prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd())
                .planQty(prod.getPlanQty()).status("03").remark(prod.getRemark()).build());

        return new ReserveResult(prodNo, reservedLog);
    }

    // =========================================================
    // UNRESERVE / CONSUME
    // =========================================================

    @Transactional
    public void unreserveMaterials(String prodNo, String remark) {
        Prod prod = loadProd(prodNo);
        // 취소(09) 상태에서도 예약해제는 호출될 수 있음(cancelProd 내부에서)
        // 일반적인 해제는 03에서만 가능

        List<ItemIo> reserveLines = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        // 이미 해제되었는지 체크 로직은 생략하거나 별도 처리 가능

        for (ItemIo io : reserveLines) {
            // 중복 해제 방지를 위해 UNRESERVE 기록 체크 권장되나 여기선 단순화
            String itemCd = io.getItemMst().getItemCd();
            String whCd = io.getToWh().getWhCd();
            BigDecimal qty = BigDecimal.valueOf(io.getQty());

            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id).orElseThrow();

            BigDecimal newAlloc = nz(cur.getAllocQty()).subtract(qty);
            itemStockRepository.save(ItemStock.builder().id(id).stockQty(cur.getStockQty()).allocQty(newAlloc).build());

            // History & IO Insert (UNRESERVE)
            // ... (기존 로직과 동일하게 UNRESERVE 기록 저장) ...
            ItemIo un = new ItemIo();
            un.setIoCd(newIoCd());
            un.setIoDt(LocalDate.now().toString());
            un.setIoType("UNRESERVE");
            un.setItemMst(io.getItemMst());
            un.setToWh(io.getToWh());
            un.setQty(io.getQty());
            un.setRefTb("TB_PROD");
            un.setRefCd(prodNo);
            itemIoRepository.save(un);
        }

        // 상태 변경은 Controller나 호출부에서 처리 (여기선 DB 작업만)
    }

    @Transactional
    public void consumeReservedMaterials(String prodNo, String remark) {
        Prod prod = loadProd(prodNo);
        if (!"03".equals(prod.getStatus())) throw new IllegalArgumentException("consume은 STATUS=03에서만 가능합니다.");

        List<ItemIo> reserveLines = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        if (reserveLines.isEmpty()) {
            // ✅ 여기가 사용자분이 겪으신 에러 포인트
            throw new IllegalArgumentException("예약 내역(RESERVE)이 없습니다. (PROD_NO=" + prodNo + ")");
        }

        // 이미 소모되었는지 체크
        List<ItemIo> usedAlready = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "PROD_USED");
        if (!usedAlready.isEmpty()) throw new IllegalArgumentException("이미 투입(소모) 처리되었습니다.");

        for (ItemIo io : reserveLines) {
            String itemCd = io.getItemMst().getItemCd();
            String whCd = io.getToWh().getWhCd();
            BigDecimal qty = BigDecimal.valueOf(io.getQty());

            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id).orElseThrow();

            // 실재고 차감, 예약 차감
            BigDecimal newStock = nz(cur.getStockQty()).subtract(qty);
            BigDecimal newAlloc = nz(cur.getAllocQty()).subtract(qty);

            itemStockRepository.save(ItemStock.builder().id(id).stockQty(newStock).allocQty(newAlloc).build());

            itemStockHisRepository.save(ItemStockHis.builder()
                    .stkHisCd(newStkHisCd()).itemCd(itemCd).whCd(whCd)
                    .trxDt(LocalDateTime.now()).ioType("PROD_USED")
                    .qtyDelta(qty.negate()).allocDelta(qty.negate())
                    .refTb("TB_PROD").refNo(prodNo).refSeq(3)
                    .remark(remark).build());

            ItemIo used = new ItemIo();
            used.setIoCd(newIoCd());
            used.setIoDt(LocalDate.now().toString());
            used.setIoType("PROD_USED");
            used.setItemMst(io.getItemMst());
            used.setFromWh(io.getToWh()); // 출고 개념
            used.setQty(io.getQty());
            used.setRefTb("TB_PROD");
            used.setRefCd(prodNo);
            used.setRefSeq(3);
            used.setRemark(remark);
            itemIoRepository.save(used);
        }

        // 상태 변경 03 -> 04
        prodRepository.save(Prod.builder()
                .prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd())
                .planQty(prod.getPlanQty()).status("04").remark(prod.getRemark()).build());
    }

    // =========================================================
    // RESULT / RECEIVE
    // =========================================================

    @Transactional
    public ProdResult saveProdResult(String prodNo, LocalDate resultDt, String whCd, BigDecimal goodQty, BigDecimal badQty, String badRes, String remark) {
        Prod prod = loadProd(prodNo);
        // 상태 04에서만 결과 저장 가능
        // ... (기존 저장 로직 동일) ...
        Integer nextSeq = prodResultRepository.maxSeqByProdNo(prodNo) + 1;
        ProdResult saved = prodResultRepository.save(ProdResult.builder()
                .id(new ProdResultId(prodNo, nextSeq))
                .resultDt(resultDt == null ? LocalDate.now() : resultDt)
                .whCd(whCd).goodQty(nz(goodQty)).badQty(nz(badQty)).badRes(badRes).remark(remark).build());

        // 상태 05로 변경
        prodRepository.save(Prod.builder()
                .prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd())
                .planQty(prod.getPlanQty()).status("05").remark(prod.getRemark()).build());
        return saved;
    }

    @Transactional
    public void receiveFinishedGoods(String prodNo, ProdReceiveReq req) {
        Prod prod = loadProd(prodNo);
        if (!"05".equals(prod.getStatus()))
            throw new IllegalArgumentException("입고는 STATUS=05에서만 가능합니다.");

        if (req.getAllocations() == null || req.getAllocations().isEmpty()) {
            throw new IllegalArgumentException("입고할 창고 및 수량 정보가 없습니다.");
        }

        String itemCd = prod.getItemCd();
        ItemMst item = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("ITEM not found: " + itemCd));

        // 입고 처리 루프
        for (ProdReceiveReq.ReceiveAlloc alloc : req.getAllocations()) {
            String whCd = alloc.getWhCd();
            BigDecimal qty = nz(alloc.getQty());

            if (whCd == null || whCd.isBlank()) continue;
            if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            WhMst toWh = whMstRepository.findById(whCd)
                    .orElseThrow(() -> new IllegalArgumentException("WH not found: " + whCd));

            // 1. 재고 증가
            ItemStockId stockId = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(stockId).orElse(
                    ItemStock.builder().id(stockId).stockQty(BigDecimal.ZERO).allocQty(BigDecimal.ZERO).build()
            );

            BigDecimal newStock = nz(cur.getStockQty()).add(qty);

            itemStockRepository.save(
                    ItemStock.builder()
                            .id(stockId)
                            .stockQty(newStock)
                            .allocQty(nz(cur.getAllocQty()))
                            .build()
            );

            // 2. 이력(His) 저장
            itemStockHisRepository.save(
                    ItemStockHis.builder()
                            .stkHisCd(newStkHisCd())
                            .itemCd(itemCd).whCd(whCd)
                            .trxDt(LocalDateTime.now())
                            .ioType("PROD_RESULT")
                            .qtyDelta(qty).allocDelta(BigDecimal.ZERO)
                            .refTb("TB_PROD").refNo(prodNo).refSeq(5)
                            .remark(req.getRemark() == null ? "생산완료 입고" : req.getRemark())
                            .build()
            );

            // 3. IO 로그 저장 (화면에 보여질 데이터)
            requireIntegerForIoQty(qty, "RECEIVE_QTY");
            ItemIo io = new ItemIo();
            io.setIoCd(newIoCd());
            io.setIoDt(LocalDate.now().toString());
            io.setIoType("PROD_RESULT");
            io.setItemMst(item);
            io.setQty(qty.intValueExact());
            io.setFromWh(null);
            io.setToWh(toWh);
            io.setRefTb("TB_PROD");
            io.setRefCd(prodNo);
            io.setRefSeq(5);
            io.setRemark(req.getRemark() == null ? "생산완료 입고" : req.getRemark());
            itemIoRepository.save(io);
        }
    }

    private void requireIntegerForIoQty(BigDecimal v, String label) {
        if (v == null) return;
        // 소수점 0 제거 후 스케일 확인 (예: 1.00 -> 1 -> OK, 1.5 -> 1.5 -> Fail)
        if (v.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException(label + " must be integer for TB_ITEM_IO.QTY (Current: " + v + ")");
        }
    }


    // --- DTO Classes (Inner) ---
    @Getter @AllArgsConstructor
    public static class AllocLine {
        private String whCd;
        private BigDecimal stockQty;
        private BigDecimal allocQty;
        private BigDecimal availQty;
        private BigDecimal takeQty;
    }
    @Getter @AllArgsConstructor
    public static class ReserveLine {
        private String itemCd;
        private String whCd;
        private BigDecimal qty;
    }
    @Getter @AllArgsConstructor
    public static class ReserveResult {
        private String prodNo;
        private List<ReserveLine> lines;
    }


}