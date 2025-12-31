package com.example.sms.service;

import com.example.sms.dto.ProdReserveReq;
import com.example.sms.dto.ProdReceiveReq;
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

    private String newProdNo() { return "P" + LocalDateTime.now().format(TS); }
    private String newStkHisCd() { return "STK" + LocalDateTime.now().format(TS); }
    private String newIoCd() {
        String v = "IO" + LocalDateTime.now().format(TS);
        return v.length() > 20 ? v.substring(0, 20) : v;
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
    private static BigDecimal nz(Double v) { return v == null ? BigDecimal.ZERO : BigDecimal.valueOf(v); }

    private Prod loadProd(String prodNo) {
        return prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));
    }

    private void requireIntegerForIoQty(BigDecimal v, String label) {
        if (v == null) return;
        if (v.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException(label + " must be integer for TB_ITEM_IO.QTY (Current: " + v + ")");
        }
    }

    // =========================================================
    // CRUD
    // =========================================================
    @Transactional
    public Prod createProd(Prod body) {
        String prodNo = (body.getProdNo() == null || body.getProdNo().isBlank())
                ? newProdNo()
                : body.getProdNo();

        if (prodRepository.existsById(prodNo))
            throw new IllegalArgumentException("Already exists: " + prodNo);

        return prodRepository.save(Prod.builder()
                .prodNo(prodNo)
                .prodDt(body.getProdDt())
                .itemCd(body.getItemCd())
                .planQty(nz(body.getPlanQty()))
                .status("01")
                .remark(body.getRemark())
                .build());
    }

    @Transactional
    public Prod updateProd(String prodNo, Prod body) {
        Prod old = loadProd(prodNo);
        String itemCd = (body.getItemCd() == null || body.getItemCd().isBlank()) ? old.getItemCd() : body.getItemCd();

        return prodRepository.save(Prod.builder()
                .prodNo(prodNo)
                .prodDt(body.getProdDt() == null ? old.getProdDt() : body.getProdDt())
                .itemCd(itemCd)
                .planQty(body.getPlanQty() == null ? old.getPlanQty() : body.getPlanQty())
                .status(body.getStatus() == null ? old.getStatus() : body.getStatus())
                .remark(body.getRemark() == null ? old.getRemark() : body.getRemark())
                .build());
    }

    @Transactional
    public Prod cancelProd(String prodNo, String remark) {
        Prod old = loadProd(prodNo);
        if ("09".equals(old.getStatus())) throw new IllegalArgumentException("이미 취소된 건입니다.");
        if (old.getStatus().compareTo("04") >= 0) throw new IllegalArgumentException("생산 진행 중이거나 완료된 건은 취소할 수 없습니다.");

        if ("03".equals(old.getStatus())) {
            unreserveMaterials(prodNo, "취소로 인한 해제");
        }
        return prodRepository.save(Prod.builder()
                .prodNo(old.getProdNo()).prodDt(old.getProdDt()).itemCd(old.getItemCd())
                .planQty(old.getPlanQty()).status("09").remark(remark).build());
    }

    // =========================================================
    // LOGIC
    // =========================================================
    private Map<String, BigDecimal> calcRequiredMaterials(String pItemCd, BigDecimal planQty) {
        List<BomMst> boms = bomRepository.findByPItemCd(pItemCd);
        Map<String, BigDecimal> req = new LinkedHashMap<>();
        for (BomMst b : boms) {
            req.put(b.getSItemCd(), nz(req.get(b.getSItemCd())).add(nz(b.getUseQty()).multiply(planQty)));
        }
        return req;
    }

    private List<AllocLine> autoAllocate(String itemCd, BigDecimal required) {
        List<ItemStock> stocks = itemStockRepository.findByIdItemCd(itemCd);
        List<AllocLine> lines = new ArrayList<>();
        for (ItemStock s : stocks) {
            BigDecimal avail = nz(s.getStockQty()).subtract(nz(s.getAllocQty()));
            lines.add(new AllocLine(s.getId().getWhCd(), nz(s.getStockQty()), nz(s.getAllocQty()), avail, BigDecimal.ZERO));
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
        return out;
    }

    private List<AllocLine> manualAllocate(String itemCd, BigDecimal required, List<ProdReserveReq.ManualAlloc> manuals) {
        List<AllocLine> lines = new ArrayList<>();
        BigDecimal totalAllocated = BigDecimal.ZERO;
        for (ProdReserveReq.ManualAlloc m : manuals) {
            if (!m.getItemCd().equals(itemCd)) continue;
            BigDecimal qty = nz(m.getQty());
            if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;
            ItemStockId id = new ItemStockId(itemCd, m.getWhCd());
            ItemStock stock = itemStockRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("재고 없음: " + m.getWhCd()));
            BigDecimal avail = nz(stock.getStockQty()).subtract(nz(stock.getAllocQty()));
            if (avail.compareTo(qty) < 0) throw new IllegalArgumentException("가용재고 부족! " + itemCd);
            lines.add(new AllocLine(m.getWhCd(), nz(stock.getStockQty()), nz(stock.getAllocQty()), avail, qty));
            totalAllocated = totalAllocated.add(qty);
        }
        if (totalAllocated.compareTo(required) != 0) throw new IllegalArgumentException("수량 불일치 (" + itemCd + ")");
        return lines;
    }

    // ✅ [수정] 예약 실행 (중복 실행 방지 추가)
    @Transactional
    public ReserveResult reserveMaterials(String prodNo, ProdReserveReq req) {
        Prod prod = loadProd(prodNo);
        if (!"02".equals(prod.getStatus())) throw new IllegalArgumentException("STATUS=02에서만 예약 가능");

        // 🔥 [중복 예약 방지] 이미 예약된 내역이 있으면 에러 혹은 스킵
        List<ItemIo> existing = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        if (!existing.isEmpty()) {
            throw new IllegalArgumentException("이미 예약된 생산계획입니다.");
        }

        BigDecimal planQty = nz(prod.getPlanQty());
        Map<String, BigDecimal> requiredMap = calcRequiredMaterials(prod.getItemCd(), planQty);
        Map<String, List<ProdReserveReq.ManualAlloc>> manualMap = new HashMap<>();
        if (req != null && req.getAllocations() != null) {
            for (ProdReserveReq.ManualAlloc m : req.getAllocations()) {
                manualMap.computeIfAbsent(m.getItemCd(), k -> new ArrayList<>()).add(m);
            }
        }

        List<ReserveLine> reservedLog = new ArrayList<>();
        int totalReserveCount = 0;

        for (Map.Entry<String, BigDecimal> e : requiredMap.entrySet()) {
            String matCd = e.getKey();
            BigDecimal required = nz(e.getValue());
            if (required.compareTo(BigDecimal.ZERO) <= 0) continue;

            List<AllocLine> allocs;
            if (manualMap.containsKey(matCd) && !manualMap.get(matCd).isEmpty()) {
                allocs = manualAllocate(matCd, required, manualMap.get(matCd));
            } else {
                allocs = autoAllocate(matCd, required);
            }

            BigDecimal allocatedSum = allocs.stream().map(AllocLine::getTakeQty).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (allocatedSum.compareTo(required) < 0) throw new IllegalArgumentException("자재 부족: " + matCd);

            for (AllocLine a : allocs) {
                BigDecimal qty = a.getTakeQty();
                if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

                ItemStockId id = new ItemStockId(matCd, a.getWhCd());
                ItemStock cur = itemStockRepository.findById(id).orElseThrow();
                itemStockRepository.save(ItemStock.builder().id(id).stockQty(cur.getStockQty()).allocQty(nz(cur.getAllocQty()).add(qty)).build());

                itemStockHisRepository.save(ItemStockHis.builder().stkHisCd(newStkHisCd()).itemCd(matCd).whCd(a.getWhCd()).trxDt(LocalDateTime.now()).ioType("RESERVE").qtyDelta(BigDecimal.ZERO).allocDelta(qty).refTb("TB_PROD").refNo(prodNo).refSeq(1).remark("예약").build());
                requireIntegerForIoQty(qty, "RESERVE_QTY");
                ItemIo io = new ItemIo();
                io.setIoCd(newIoCd()); io.setIoDt(LocalDate.now().toString()); io.setIoType("RESERVE");
                io.setItemMst(itemRepository.findById(matCd).orElseThrow()); io.setToWh(whMstRepository.findById(a.getWhCd()).orElseThrow());
                io.setQty(qty.intValueExact()); io.setRefTb("TB_PROD"); io.setRefCd(prodNo); io.setRefSeq(1); io.setRemark("예약");
                itemIoRepository.save(io);
                reservedLog.add(new ReserveLine(matCd, a.getWhCd(), qty));
                totalReserveCount++;
            }
        }
        if (totalReserveCount == 0) throw new IllegalArgumentException("예약된 자재 없음");
        prodRepository.save(Prod.builder().prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd()).planQty(prod.getPlanQty()).status("03").remark(prod.getRemark()).build());
        return new ReserveResult(prodNo, reservedLog);
    }

    @Transactional
    public void unreserveMaterials(String prodNo, String remark) {
        // 중복 해제 방지
        List<ItemIo> alreadyUnreserved = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "UNRESERVE");
        if (!alreadyUnreserved.isEmpty()) return;

        List<ItemIo> reserveLines = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        for (ItemIo io : reserveLines) {
            String itemCd = io.getItemMst().getItemCd();
            String whCd = io.getToWh().getWhCd();
            BigDecimal qty = BigDecimal.valueOf(io.getQty());
            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id).orElseThrow();
            BigDecimal newAlloc = nz(cur.getAllocQty()).subtract(qty);
            if (newAlloc.compareTo(BigDecimal.ZERO) < 0) newAlloc = BigDecimal.ZERO;
            itemStockRepository.save(ItemStock.builder().id(id).stockQty(cur.getStockQty()).allocQty(newAlloc).build());

            itemStockHisRepository.save(ItemStockHis.builder().stkHisCd(newStkHisCd()).itemCd(itemCd).whCd(whCd).trxDt(LocalDateTime.now()).ioType("UNRESERVE").qtyDelta(BigDecimal.ZERO).allocDelta(qty.negate()).refTb("TB_PROD").refNo(prodNo).refSeq(2).remark(remark).build());
            ItemIo un = new ItemIo();
            un.setIoCd(newIoCd()); un.setIoDt(LocalDate.now().toString()); un.setIoType("UNRESERVE");
            un.setItemMst(io.getItemMst()); un.setToWh(io.getToWh()); un.setQty(io.getQty());
            un.setRefTb("TB_PROD"); un.setRefCd(prodNo); un.setRefSeq(2); un.setRemark(remark);
            itemIoRepository.save(un);
        }
    }

    @Transactional
    public void consumeReservedMaterials(String prodNo, String remark) {
        Prod prod = loadProd(prodNo);
        if (!"03".equals(prod.getStatus())) throw new IllegalArgumentException("STATUS=03에서만 가능");
        List<ItemIo> reserveLines = itemIoRepository.findByRefTbAndRefCdAndIoType("TB_PROD", prodNo, "RESERVE");
        if (reserveLines.isEmpty()) throw new IllegalArgumentException("예약 내역 없음");

        for (ItemIo io : reserveLines) {
            String itemCd = io.getItemMst().getItemCd();
            String whCd = io.getToWh().getWhCd();
            BigDecimal qty = BigDecimal.valueOf(io.getQty());
            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id).orElseThrow();

            itemStockRepository.save(ItemStock.builder().id(id).stockQty(nz(cur.getStockQty()).subtract(qty)).allocQty(nz(cur.getAllocQty()).subtract(qty)).build());

            itemStockHisRepository.save(ItemStockHis.builder().stkHisCd(newStkHisCd()).itemCd(itemCd).whCd(whCd).trxDt(LocalDateTime.now()).ioType("PROD_USED").qtyDelta(qty.negate()).allocDelta(qty.negate()).refTb("TB_PROD").refNo(prodNo).refSeq(3).remark(remark).build());
            ItemIo used = new ItemIo();
            used.setIoCd(newIoCd()); used.setIoDt(LocalDate.now().toString()); used.setIoType("PROD_USED");
            used.setItemMst(io.getItemMst()); used.setFromWh(io.getToWh()); used.setQty(io.getQty());
            used.setRefTb("TB_PROD"); used.setRefCd(prodNo); used.setRefSeq(3); used.setRemark(remark);
            itemIoRepository.save(used);
        }
        prodRepository.save(Prod.builder().prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd()).planQty(prod.getPlanQty()).status("04").remark(prod.getRemark()).build());
    }

    @Transactional
    public ProdResult saveProdResult(String prodNo, LocalDate resultDt, String whCd, BigDecimal goodQty, BigDecimal badQty, String badRes, String remark) {
        Prod prod = loadProd(prodNo);
        Integer nextSeq = prodResultRepository.maxSeqByProdNo(prodNo) + 1;
        ProdResult saved = prodResultRepository.save(ProdResult.builder()
                .id(new ProdResultId(prodNo, nextSeq))
                .resultDt(resultDt == null ? LocalDate.now() : resultDt)
                .whCd(whCd).goodQty(nz(goodQty)).badQty(nz(badQty)).badRes(badRes).remark(remark).build());

        prodRepository.save(Prod.builder()
                .prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd())
                .planQty(prod.getPlanQty()).status("05").remark(prod.getRemark()).build());
        return saved;
    }

    @Transactional
    public void receiveFinishedGoods(String prodNo, ProdReceiveReq req) {
        Prod prod = loadProd(prodNo);
        if (prod.getStatus().compareTo("05") < 0) throw new IllegalArgumentException("생산완료(05) 이후에만 입고 가능");

        String itemCd = prod.getItemCd();
        ItemMst item = itemRepository.findById(itemCd).orElseThrow();

        for (ProdReceiveReq.ReceiveAlloc alloc : req.getAllocations()) {
            String whCd = alloc.getWhCd();
            BigDecimal qty = nz(alloc.getQty());
            if (qty.compareTo(BigDecimal.ZERO) <= 0) continue;

            WhMst toWh = whMstRepository.findById(whCd).orElseThrow();
            ItemStockId id = new ItemStockId(itemCd, whCd);
            ItemStock cur = itemStockRepository.findById(id).orElse(ItemStock.builder().id(id).stockQty(BigDecimal.ZERO).allocQty(BigDecimal.ZERO).build());

            itemStockRepository.save(ItemStock.builder().id(id).stockQty(nz(cur.getStockQty()).add(qty)).allocQty(nz(cur.getAllocQty())).build());

            itemStockHisRepository.save(ItemStockHis.builder().stkHisCd(newStkHisCd()).itemCd(itemCd).whCd(whCd).trxDt(LocalDateTime.now()).ioType("PROD_RESULT").qtyDelta(qty).allocDelta(BigDecimal.ZERO).refTb("TB_PROD").refNo(prodNo).refSeq(5).remark("완제품입고").build());
            requireIntegerForIoQty(qty, "RECEIVE_QTY");
            ItemIo io = new ItemIo();
            io.setIoCd(newIoCd()); io.setIoDt(LocalDate.now().toString()); io.setIoType("PROD_RESULT");
            io.setItemMst(item); io.setToWh(toWh); io.setQty(qty.intValueExact());
            io.setRefTb("TB_PROD"); io.setRefCd(prodNo); io.setRefSeq(5);
            itemIoRepository.save(io);
        }

        prodRepository.save(Prod.builder()
                .prodNo(prod.getProdNo()).prodDt(prod.getProdDt()).itemCd(prod.getItemCd())
                .planQty(prod.getPlanQty()).status("07").remark(prod.getRemark()).build());
    }

    @Getter @AllArgsConstructor
    public static class AllocLine {
        private String whCd; private BigDecimal stockQty; private BigDecimal allocQty; private BigDecimal availQty; private BigDecimal takeQty;
    }
    @Getter @AllArgsConstructor
    public static class ReserveLine {
        private String itemCd; private String whCd; private BigDecimal qty;
    }
    @Getter @AllArgsConstructor
    public static class ReserveResult {
        private String prodNo; private List<ReserveLine> lines;
    }
}