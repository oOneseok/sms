package com.example.sms.service;

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

    private final ItemRepository itemRepository;        // ItemMst
    private final BomRepository bomRepository;          // BomMst
    private final ItemStockRepository itemStockRepository;
    private final ItemStockHisRepository itemStockHisRepository;

    private final ItemIoRepository itemIoRepository;
    private final WhMstRepository whMstRepository;

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private String newProdNo() { return "PROD" + LocalDateTime.now().format(TS); }
    private String newStkHisCd() { return "STK" + LocalDateTime.now().format(TS); }

    private String newIoCd() {
        String v = "IO" + LocalDateTime.now().format(TS);
        return v.length() > 20 ? v.substring(0, 20) : v;
    }

    // ---------------------------
    // NZ helpers
    // ---------------------------
    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    // ✅ BomMst.useQty 가 Double인 경우 대응 (네 컴파일 에러 원인)
    private static BigDecimal nz(Double v) {
        return v == null ? BigDecimal.ZERO : BigDecimal.valueOf(v);
    }

    private static void requireNonNegative(BigDecimal v, String msg) {
        if (v == null || v.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException(msg);
    }

    private static void requireIntegerForIoQty(BigDecimal v, String label) {
        if (v == null) return;
        if (v.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException(label + " must be integer for TB_ITEM_IO.QTY (현재: " + v + ")");
        }
    }

    private void validateProductItem(String itemCd) {
        ItemMst item = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("ITEM not found: " + itemCd));
        if (!"02".equals(item.getItemFlag())) {
            throw new IllegalArgumentException("ITEM_FLAG must be 02(product). itemCd=" + itemCd);
        }
    }

    private Prod loadProd(String prodNo) {
        return prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));
    }

    // =========================================================
    // CRUD
    // =========================================================
    @Transactional
    public Prod createProd(Prod body) {
        String prodNo = (body.getProdNo() == null || body.getProdNo().isBlank()) ? newProdNo() : body.getProdNo();

        if (body.getItemCd() == null || body.getItemCd().isBlank())
            throw new IllegalArgumentException("ITEM_CD is required");
        validateProductItem(body.getItemCd());

        if (prodRepository.existsById(prodNo))
            throw new IllegalArgumentException("Already exists: " + prodNo);

        return prodRepository.save(
                Prod.builder()
                        .prodNo(prodNo)
                        .prodDt(body.getProdDt()) // String
                        .itemCd(body.getItemCd())
                        .planQty(nz(body.getPlanQty()))
                        .status(body.getStatus() == null || body.getStatus().isBlank() ? "01" : body.getStatus())
                        .remark(body.getRemark())
                        .build()
        );
    }

    @Transactional
    public Prod updateProd(String prodNo, Prod body) {
        Prod old = loadProd(prodNo);

        String itemCd = (body.getItemCd() == null || body.getItemCd().isBlank()) ? old.getItemCd() : body.getItemCd();
        validateProductItem(itemCd);

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

    @Transactional
    public Prod cancelProd(String prodNo, String remark) {
        Prod old = loadProd(prodNo);

        // ✅ 생산대기(03)면 예약해제 먼저 해야 함(원상복구)
        if ("03".equals(old.getStatus())) {
            unreserveMaterials(prodNo, "취소로 인한 예약해제");
        }

        return prodRepository.save(
                Prod.builder()
                        .prodNo(old.getProdNo())
                        .prodDt(old.getProdDt())
                        .itemCd(old.getItemCd())
                        .planQty(old.getPlanQty())
                        .status("09")
                        .remark(remark == null ? old.getRemark() : remark)
                        .build()
        );
    }

    // =========================================================
    //  MRP / RESERVE / UNRESERVE / CONSUME
    // =========================================================

    /**
     * BOM 기준 자재 필요수량 계산
     * - bomRepository.findByPItemCd 에서 sItemCd/useQty 필요
     */
    private Map<String, BigDecimal> calcRequiredMaterials(String pItemCd, BigDecimal planQty) {
        requireNonNegative(planQty, "PLAN_QTY must be >= 0");

        List<BomMst> boms = bomRepository.findByPItemCd(pItemCd);

        // 같은 자재가 여러 줄이면 합산
        Map<String, BigDecimal> req = new LinkedHashMap<>();
        for (BomMst b : boms) {
            String sItemCd = b.getSItemCd();

            // ✅ 여기! BomMst.getUseQty()가 Double이면 nz(Double)로 처리됨
            BigDecimal useQty = nz(b.getUseQty());

            BigDecimal add = useQty.multiply(planQty);
            req.put(sItemCd, nz(req.get(sItemCd)).add(add));
        }
        return req;
    }

    /**
     * 가용 많은 순으로 자동 배분
     * - avail = stockQty - allocQty
     */
    private List<AllocLine> autoAllocate(String itemCd, BigDecimal required) {
        if (required.compareTo(BigDecimal.ZERO) <= 0) return List.of();

        List<ItemStock> stocks = itemStockRepository.findByIdItemCd(itemCd);

        List<AllocLine> lines = new ArrayList<>();
        for (ItemStock s : stocks) {
            String whCd = s.getId().getWhCd();
            BigDecimal stock = nz(s.getStockQty());
            BigDecimal alloc = nz(s.getAllocQty());
            BigDecimal avail = stock.subtract(alloc);
            lines.add(new AllocLine(whCd, stock, alloc, avail, BigDecimal.ZERO));
        }
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
            throw new IllegalArgumentException("MRP 부족: itemCd=" + itemCd + " required=" + required + " remain=" + remain);
        }
        return out;
    }

    /**
     * 02 -> 03 (예약)
     * - IO_TYPE=RESERVE
     * - TB_ITEMSTOCK: stockQty -= qty, allocQty += qty
     * - HIS: qty_delta=-qty, alloc_delta=+qty (둘다 null 금지)
     */
    @Transactional
    public ReserveResult reserveMaterials(String prodNo, String remark) {
        Prod prod = loadProd(prodNo);

        if ("09".equals(prod.getStatus())) throw new IllegalArgumentException("Canceled PROD cannot be reserved.");
        if (!"02".equals(prod.getStatus()))
            throw new IllegalArgumentException("reserve는 STATUS=02에서만 가능합니다. 현재=" + prod.getStatus());

        BigDecimal planQty = nz(prod.getPlanQty());
        if (planQty.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("PLAN_QTY must be > 0");

        // 중복 방지 (refSeq=1)
        itemIoRepository.findByRefTbAndRefCdAndRefSeq("TB_PROD", prodNo, 1)
                .ifPresent(x -> { throw new IllegalArgumentException("이미 예약 처리됨(중복). prodNo=" + prodNo); });

        Map<String, BigDecimal> requiredMap = calcRequiredMaterials(prod.getItemCd(), planQty);

        List<ReserveLine> reserved = new ArrayList<>();

        for (Map.Entry<String, BigDecimal> e : requiredMap.entrySet()) {
            String matCd = e.getKey();
            BigDecimal required = nz(e.getValue());
            if (required.compareTo(BigDecimal.ZERO) <= 0) continue;

            List<AllocLine> allocs = autoAllocate(matCd, required);

            for (AllocLine a : allocs) {
                BigDecimal qty = a.getTakeQty();
                if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

                ItemStockId id = new ItemStockId(matCd, a.getWhCd());
                ItemStock cur = itemStockRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("재고 없음: item=" + matCd + ", wh=" + a.getWhCd()));

                BigDecimal newStock = nz(cur.getStockQty()).subtract(qty);
                BigDecimal newAlloc = nz(cur.getAllocQty()).add(qty);

                if (newStock.compareTo(BigDecimal.ZERO) < 0)
                    throw new IllegalArgumentException("예약 처리 중 재고 음수 발생: item=" + matCd + ", wh=" + a.getWhCd());

                itemStockRepository.save(
                        ItemStock.builder()
                                .id(id)
                                .stockQty(newStock)
                                .allocQty(newAlloc)
                                .build()
                );

                itemStockHisRepository.save(
                        ItemStockHis.builder()
                                .stkHisCd(newStkHisCd())
                                .itemCd(matCd)
                                .whCd(a.getWhCd())
                                .trxDt(LocalDateTime.now())
                                .ioType("RESERVE")
                                .qtyDelta(qty.negate())
                                .allocDelta(qty) // ✅ null 금지
                                .refTb("TB_PROD")
                                .refNo(prodNo)
                                .refSeq(1)
                                .remark(remark == null ? "생산예약" : remark)
                                .build()
                );

                requireIntegerForIoQty(qty, "RESERVE_QTY");
                ItemMst mat = itemRepository.findById(matCd)
                        .orElseThrow(() -> new IllegalArgumentException("ITEM not found: " + matCd));
                WhMst wh = whMstRepository.findById(a.getWhCd())
                        .orElseThrow(() -> new IllegalArgumentException("WH not found: " + a.getWhCd()));

                ItemIo io = new ItemIo();
                io.setIoCd(newIoCd());
                io.setIoDt(LocalDate.now().toString());
                io.setIoType("RESERVE");
                io.setItemMst(mat);
                io.setQty(qty.intValueExact());
                io.setFromWh(null);
                io.setToWh(wh);
                io.setRefTb("TB_PROD");
                io.setRefCd(prodNo);
                io.setRefSeq(1);
                io.setRemark(remark == null ? "생산예약" : remark);
                itemIoRepository.save(io);

                reserved.add(new ReserveLine(matCd, a.getWhCd(), qty));
            }
        }

        // 상태 03
        prodRepository.save(
                Prod.builder()
                        .prodNo(prod.getProdNo())
                        .prodDt(prod.getProdDt())
                        .itemCd(prod.getItemCd())
                        .planQty(prod.getPlanQty())
                        .status("03")
                        .remark(prod.getRemark())
                        .build()
        );

        return new ReserveResult(prodNo, reserved);
    }

    @Transactional
    public void unreserveMaterials(String prodNo, String remark) {
        Prod prod = loadProd(prodNo);
        if (!"03".equals(prod.getStatus()))
            throw new IllegalArgumentException("unreserve는 STATUS=03에서만 가능합니다. 현재=" + prod.getStatus());

        List<ItemIo> reserveLines = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        if (reserveLines.isEmpty()) throw new IllegalArgumentException("예약 내역(RESERVE)이 없습니다. prodNo=" + prodNo);

        List<ItemIo> unreserveAlready = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "UNRESERVE");
        if (!unreserveAlready.isEmpty()) throw new IllegalArgumentException("이미 UNRESERVE 처리됨(중복). prodNo=" + prodNo);

        for (ItemIo io : reserveLines) {
            String itemCd = io.getItemMst().getItemCd();
            String whCd = io.getToWh().getWhCd();
            BigDecimal qty = BigDecimal.valueOf(io.getQty());

            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("재고 없음: item=" + itemCd + ", wh=" + whCd));

            BigDecimal newStock = nz(cur.getStockQty()).add(qty);
            BigDecimal newAlloc = nz(cur.getAllocQty()).subtract(qty);
            if (newAlloc.compareTo(BigDecimal.ZERO) < 0)
                throw new IllegalArgumentException("예약해제 중 alloc 음수: item=" + itemCd + ", wh=" + whCd);

            itemStockRepository.save(
                    ItemStock.builder()
                            .id(id)
                            .stockQty(newStock)
                            .allocQty(newAlloc)
                            .build()
            );

            itemStockHisRepository.save(
                    ItemStockHis.builder()
                            .stkHisCd(newStkHisCd())
                            .itemCd(itemCd)
                            .whCd(whCd)
                            .trxDt(LocalDateTime.now())
                            .ioType("UNRESERVE")
                            .qtyDelta(qty)                 // ✅ null 금지
                            .allocDelta(qty.negate())      // ✅ null 금지
                            .refTb("TB_PROD")
                            .refNo(prodNo)
                            .refSeq(2)
                            .remark(remark == null ? "예약배정 취소" : remark)
                            .build()
            );

            ItemIo un = new ItemIo();
            un.setIoCd(newIoCd());
            un.setIoDt(LocalDate.now().toString());
            un.setIoType("UNRESERVE");
            un.setItemMst(io.getItemMst());
            un.setQty(io.getQty());
            un.setFromWh(null);
            un.setToWh(io.getToWh());
            un.setRefTb("TB_PROD");
            un.setRefCd(prodNo);
            un.setRefSeq(2);
            un.setRemark(remark == null ? "예약배정 취소" : remark);
            itemIoRepository.save(un);
        }
    }

    @Transactional
    public void consumeReservedMaterials(String prodNo, String remark) {
        Prod prod = loadProd(prodNo);
        if (!"03".equals(prod.getStatus()))
            throw new IllegalArgumentException("consume은 STATUS=03에서만 가능합니다. 현재=" + prod.getStatus());

        List<ItemIo> reserveLines = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        if (reserveLines.isEmpty()) throw new IllegalArgumentException("예약 내역(RESERVE)이 없습니다. prodNo=" + prodNo);

        List<ItemIo> usedAlready = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "PROD_USED");
        if (!usedAlready.isEmpty()) throw new IllegalArgumentException("이미 PROD_USED 처리됨(중복). prodNo=" + prodNo);

        for (ItemIo io : reserveLines) {
            String itemCd = io.getItemMst().getItemCd();
            String whCd = io.getToWh().getWhCd();
            BigDecimal qty = BigDecimal.valueOf(io.getQty());

            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("재고 없음: item=" + itemCd + ", wh=" + whCd));

            BigDecimal newAlloc = nz(cur.getAllocQty()).subtract(qty);
            if (newAlloc.compareTo(BigDecimal.ZERO) < 0)
                throw new IllegalArgumentException("소모 전환 중 alloc 음수: item=" + itemCd + ", wh=" + whCd);

            itemStockRepository.save(
                    ItemStock.builder()
                            .id(id)
                            .stockQty(nz(cur.getStockQty()))
                            .allocQty(newAlloc)
                            .build()
            );

            itemStockHisRepository.save(
                    ItemStockHis.builder()
                            .stkHisCd(newStkHisCd())
                            .itemCd(itemCd)
                            .whCd(whCd)
                            .trxDt(LocalDateTime.now())
                            .ioType("PROD_USED")
                            .qtyDelta(BigDecimal.ZERO)      // ✅ null 금지
                            .allocDelta(qty.negate())       // ✅ null 금지
                            .refTb("TB_PROD")
                            .refNo(prodNo)
                            .refSeq(3)
                            .remark(remark == null ? "생산투입(예약→소모)" : remark)
                            .build()
            );

            ItemIo used = new ItemIo();
            used.setIoCd(newIoCd());
            used.setIoDt(LocalDate.now().toString());
            used.setIoType("PROD_USED");
            used.setItemMst(io.getItemMst());
            used.setQty(io.getQty());
            used.setFromWh(io.getToWh());
            used.setToWh(null);
            used.setRefTb("TB_PROD");
            used.setRefCd(prodNo);
            used.setRefSeq(3);
            used.setRemark(remark == null ? "생산투입" : remark);
            itemIoRepository.save(used);
        }

        prodRepository.save(
                Prod.builder()
                        .prodNo(prod.getProdNo())
                        .prodDt(prod.getProdDt())
                        .itemCd(prod.getItemCd())
                        .planQty(prod.getPlanQty())
                        .status("04")
                        .remark(prod.getRemark())
                        .build()
        );
    }

    // =========================================================
    // RESULT / RECEIVE
    // =========================================================

    /**
     * ✅ 생산완료 저장 (TB_PROD_RESULT)
     * - TB_PROD_RESULT.WH_CD가 NOT NULL이면 whCd 반드시 받아야 함.
     */
    @Transactional
    public ProdResult saveProdResult(String prodNo,
                                     LocalDate resultDt,
                                     String whCd,                // ✅ 반드시 포함 (Controller도 포함해야 함)
                                     BigDecimal goodQty,
                                     BigDecimal badQty,
                                     String badRes,
                                     String remark) {

        Prod prod = loadProd(prodNo);

        if ("09".equals(prod.getStatus())) throw new IllegalArgumentException("Canceled PROD cannot be processed.");
        if (!"04".equals(prod.getStatus()))
            throw new IllegalArgumentException("result 저장은 STATUS=04(생산중)에서만 가능합니다. 현재=" + prod.getStatus());

        // ✅ DB가 NOT NULL이면 여기서 막아주는 게 맞음
        if (whCd == null || whCd.isBlank()) {
            throw new IllegalArgumentException("WH_CD is required (TB_PROD_RESULT.WH_CD is NOT NULL)");
        }
        whMstRepository.findById(whCd).orElseThrow(() -> new IllegalArgumentException("WH not found: " + whCd));

        Integer nextSeq = prodResultRepository.maxSeqByProdNo(prodNo) + 1;

        ProdResult saved = prodResultRepository.save(
                ProdResult.builder()
                        .id(new ProdResultId(prodNo, nextSeq))
                        .resultDt(resultDt == null ? LocalDate.now() : resultDt)
                        .whCd(whCd) // ✅ NOT NULL
                        .goodQty(nz(goodQty))
                        .badQty(nz(badQty))
                        .badRes(badRes)
                        .remark(remark)
                        .build()
        );

        // 상태 05
        prodRepository.save(
                Prod.builder()
                        .prodNo(prod.getProdNo())
                        .prodDt(prod.getProdDt())
                        .itemCd(prod.getItemCd())
                        .planQty(prod.getPlanQty())
                        .status("05")
                        .remark(prod.getRemark())
                        .build()
        );

        return saved;
    }

    @Transactional
    public void receiveFinishedGoods(String prodNo, String whCd, BigDecimal qty, String remark) {
        Prod prod = loadProd(prodNo);
        if (!"05".equals(prod.getStatus()))
            throw new IllegalArgumentException("입고는 STATUS=05에서만 가능합니다. 현재=" + prod.getStatus());

        if (whCd == null || whCd.isBlank()) throw new IllegalArgumentException("WH_CD is required");
        WhMst toWh = whMstRepository.findById(whCd)
                .orElseThrow(() -> new IllegalArgumentException("WH not found: " + whCd));

        BigDecimal add = nz(qty);
        if (add.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("입고 수량은 0보다 커야 합니다.");

        String itemCd = prod.getItemCd();
        ItemStockId stockId = new ItemStockId(itemCd, whCd);

        ItemStock cur = itemStockRepository.findById(stockId).orElse(
                ItemStock.builder().id(stockId).stockQty(BigDecimal.ZERO).allocQty(BigDecimal.ZERO).build()
        );

        BigDecimal newStock = nz(cur.getStockQty()).add(add);

        itemStockRepository.save(
                ItemStock.builder()
                        .id(stockId)
                        .stockQty(newStock)
                        .allocQty(nz(cur.getAllocQty()))
                        .build()
        );

        itemStockHisRepository.save(
                ItemStockHis.builder()
                        .stkHisCd(newStkHisCd())
                        .itemCd(itemCd)
                        .whCd(whCd)
                        .trxDt(LocalDateTime.now())
                        .ioType("PROD_RESULT")
                        .qtyDelta(add)
                        .allocDelta(BigDecimal.ZERO) // ✅ null 금지
                        .refTb("TB_PROD")
                        .refNo(prodNo)
                        .refSeq(5)
                        .remark(remark == null ? "생산완료 입고" : remark)
                        .build()
        );

        ItemMst item = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("ITEM not found: " + itemCd));

        requireIntegerForIoQty(add, "RECEIVE_QTY");

        ItemIo io = new ItemIo();
        io.setIoCd(newIoCd());
        io.setIoDt(LocalDate.now().toString());
        io.setIoType("PROD_RESULT");
        io.setItemMst(item);
        io.setQty(add.intValueExact());
        io.setFromWh(null);
        io.setToWh(toWh);
        io.setRefTb("TB_PROD");
        io.setRefCd(prodNo);
        io.setRefSeq(5);
        io.setRemark(remark == null ? "생산완료 입고" : remark);
        itemIoRepository.save(io);
    }

    // =========================================================
    // DTO (Service 내부용)
    // =========================================================
    @Getter
    @AllArgsConstructor
    public static class AllocLine {
        private String whCd;
        private BigDecimal stockQty;
        private BigDecimal allocQty;
        private BigDecimal availQty;
        private BigDecimal takeQty;
    }

    @Getter
    @AllArgsConstructor
    public static class ReserveLine {
        private String itemCd;
        private String whCd;
        private BigDecimal qty;
    }

    @Getter
    @AllArgsConstructor
    public static class ReserveResult {
        private String prodNo;
        private List<ReserveLine> lines;
    }
}
