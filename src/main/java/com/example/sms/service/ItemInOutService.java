package com.example.sms.service;

import com.example.sms.dto.ItemInOutDto;
import com.example.sms.dto.StockHistoryDto;
import com.example.sms.entity.*;
import com.example.sms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemInOutService {

    private final ItemIoRepository itemIoRepository;
    private final ItemStockRepository itemStockRepository;
    private final ItemStockHisRepository itemStockHisRepository;
    private final ItemRepository itemRepository;
    private final WhMstRepository whMstRepository;

    // 날짜 및 상세 정보 조회를 위한 레포지토리
    private final PurchaseMstRepository purchaseMstRepository;
    private final OrderMstRepository orderMstRepository;
    private final CustRepository custRepository;

    // 대기 목록 조회를 위한 서비스
    private final PurchaseService purchaseService;
    private final OrderService orderService;

    private final LogService logService;

    // ID 생성 유틸
    private String generateId(String prefix) {
        return prefix + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
    }

    /**
     * ✅ [수정됨] 전체 입출고 내역 + 대기 목록 통합 조회 및 정렬
     */
    public List<ItemInOutDto> getInOutList(String sortDirection) {
        List<ItemInOutDto> resultList = new ArrayList<>();

        // 1. [완료] 입출고 확정 내역 조회 (DB)
        List<ItemInOutDto> completedList = itemIoRepository.findAll().stream()
                .map(io -> ItemInOutDto.builder()
                        .id(io.getIoCd())
                        .ioCd(io.getIoCd())
                        .ioDt(io.getIoDt()) // 입출고일자
                        .ioType(io.getIoType()) // "IN" or "OUT"
                        .itemCd(io.getItemMst().getItemCd())
                        .itemNm(io.getItemMst().getItemNm())   // 품목명
                        .itemSpec(io.getItemMst().getItemSpec()) // 규격
                        .qty(io.getQty())
                        .fromWhCd(io.getFromWh() != null ? io.getFromWh().getWhCd() : null)
                        .toWhCd(io.getToWh() != null ? io.getToWh().getWhCd() : null)
                        .refCd(io.getRefCd())
                        .refSeq(io.getRefSeq())
                        .remark(io.getRemark())
                        .status("COMPLETE") // 완료 상태
                        .build())
                .collect(Collectors.toList());
        resultList.addAll(completedList);

        // 2. [대기] 발주 확정 (입고 대기) 조회
        List<PurchaseDetMst> waitInEntities = purchaseService.getWaitingForInboundList();
        for (PurchaseDetMst det : waitInEntities) {
            // 발주 마스터에서 날짜 가져오기
            String pDate = purchaseMstRepository.findById(det.getId().getPurchaseCd())
                    .map(m -> m.getPurchaseDt().toString())
                    .orElse("");

            // 품목 정보 가져오기 (생성자 protected 문제 해결: builder 사용)
            ItemMst item = itemRepository.findById(det.getItemCd())
                    .orElse(ItemMst.builder().itemNm("미등록").itemSpec("-").build());

            resultList.add(ItemInOutDto.builder()
                    .id("WAIT-IN-" + det.getId().getPurchaseCd() + "-" + det.getId().getSeqNo())
                    .ioCd(det.getId().getPurchaseCd()) // 아직 입고번호 없으므로 발주번호 표시
                    .ioDt(pDate) // 발주일자를 기준일로 사용
                    .ioType("WAIT_IN") // 입고 대기
                    .itemCd(det.getItemCd())
                    .itemNm(item.getItemNm())
                    .itemSpec(item.getItemSpec())
                    .qty(det.getPurchaseQty())
                    .refCd(det.getId().getPurchaseCd())
                    .refSeq(det.getId().getSeqNo())
                    .remark("입고 대기 (발주확정)")
                    .status("WAITING") // 대기 상태
                    .build());
        }

        // 3. [대기] 주문 확정 (출고 대기) 조회
        List<OrderDetMst> waitOutEntities = orderService.getWaitingForOutboundList();
        for (OrderDetMst det : waitOutEntities) {
            // 주문 마스터에서 날짜 가져오기
            String oDate = orderMstRepository.findById(det.getId().getOrderCd())
                    .map(m -> m.getOrderDt().toString())
                    .orElse("");

            // 품목 정보 가져오기 (builder 사용)
            ItemMst item = itemRepository.findById(det.getItemCd())
                    .orElse(ItemMst.builder().itemNm("미등록").itemSpec("-").build());

            resultList.add(ItemInOutDto.builder()
                    .id("WAIT-OUT-" + det.getId().getOrderCd() + "-" + det.getId().getSeqNo())
                    .ioCd(det.getId().getOrderCd())
                    .ioDt(oDate) // 주문일자를 기준일로 사용
                    .ioType("WAIT_OUT") // 출고 대기
                    .itemCd(det.getItemCd())
                    .itemNm(item.getItemNm())
                    .itemSpec(item.getItemSpec())
                    .qty(det.getOrderQty())
                    .refCd(det.getId().getOrderCd())
                    .refSeq(det.getId().getSeqNo())
                    .remark("출고 대기 (주문확정)")
                    .status("WAITING")
                    .build());
        }

        // 4. 통합 정렬 (Java Stream Sort)
        // 날짜(ioDt) 기준 정렬, null은 마지막에 위치
        Comparator<ItemInOutDto> comparator = Comparator.comparing(ItemInOutDto::getIoDt, Comparator.nullsLast(Comparator.naturalOrder()));

        if ("DESC".equalsIgnoreCase(sortDirection)) {
            comparator = comparator.reversed();
        }

        return resultList.stream()
                .sorted(comparator)
                .collect(Collectors.toList());
    }

    // --- (아래부터는 기존 로직 유지, 일부 리팩토링 없음) ---

    @Transactional
    public void updateStock(String itemCd, String whCd, BigDecimal qty, boolean isIncrease) {
        ItemStockId id = ItemStockId.builder().itemCd(itemCd).whCd(whCd).build();
        ItemStock stock = itemStockRepository.findById(id)
                .orElse(ItemStock.builder().id(id).stockQty(BigDecimal.ZERO).allocQty(BigDecimal.ZERO).build());

        BigDecimal current = stock.getStockQty();
        BigDecimal next = isIncrease ? current.add(qty) : current.subtract(qty);

        if (next.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("재고가 부족합니다. (현재: " + current + ", 요청: " + qty + ")");
        }

        stock.setStockQty(next);
        itemStockRepository.save(stock);
    }

    @Transactional
    public void saveStockHistory(String ioCd, String itemCd, String whCd, String ioType, BigDecimal qtyDelta, String refTb, String refCd) {
        String custCd = null;
        if ("TB_PURCHASE".equals(refTb) && refCd != null) {
            custCd = purchaseMstRepository.findById(refCd).map(PurchaseMst::getCustCd).orElse(null);
        } else if ("TB_ORDER".equals(refTb) && refCd != null) {
            custCd = orderMstRepository.findById(refCd).map(OrderMst::getCustCd).orElse(null);
        }

        ItemStockHis history = ItemStockHis.builder()
                .stkHisCd(generateId("HIS"))
                .itemCd(itemCd).whCd(whCd).trxDt(LocalDateTime.now()).custCd(custCd)
                .ioCd(ioCd).ioType(ioType).qtyDelta(qtyDelta).allocDelta(BigDecimal.ZERO)
                .refTb(refTb).refNo(refCd).remark(ioType.equals("IN") ? "입고" : "출고")
                .build();
        itemStockHisRepository.save(history);
    }

    @Transactional
    public void registerInboundFromPurchase(String purchaseCd, Integer seqNo, String toWhCd, String itemCd, Integer qty, String remark) {
        String ioCd = generateId("IO");
        String ioDt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        ItemMst itemMst = itemRepository.findById(itemCd).orElseThrow(() -> new IllegalArgumentException("품목 오류: " + itemCd));
        WhMst toWh = whMstRepository.findById(toWhCd).orElseThrow(() -> new IllegalArgumentException("창고 오류: " + toWhCd));

        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd); itemIo.setIoDt(ioDt); itemIo.setIoType("IN");
        itemIo.setItemMst(itemMst); itemIo.setQty(qty); itemIo.setToWh(toWh); itemIo.setRemark(remark);
        itemIo.setRefTb("TB_PURCHASE"); itemIo.setRefCd(purchaseCd); itemIo.setRefSeq(seqNo);
        itemIoRepository.save(itemIo);

        updateStock(itemCd, toWhCd, BigDecimal.valueOf(qty), true);
        saveStockHistory(ioCd, itemCd, toWhCd, "IN", BigDecimal.valueOf(qty), "TB_PURCHASE", purchaseCd);
        purchaseService.updateDetailStatus(purchaseCd, seqNo, "p3");
        logService.saveLog("입고 관리", "등록", ioCd, "발주번호: " + purchaseCd + ", 품목: " + itemCd);
    }

    @Transactional
    public void registerOutboundFromOrder(String orderCd, Integer seqNo, String itemCd, String fromWhCd, Integer qty, String remark) {
        ItemStockId stockId = ItemStockId.builder().itemCd(itemCd).whCd(fromWhCd).build();
        ItemStock currentStock = itemStockRepository.findById(stockId)
                .orElseThrow(() -> new IllegalArgumentException("해당 창고에 품목 정보가 없습니다."));

        if (currentStock.getStockQty().compareTo(BigDecimal.valueOf(qty)) < 0) {
            throw new IllegalArgumentException("재고가 부족합니다. (현재고: " + currentStock.getStockQty() + ")");
        }

        String ioCd = generateId("IO");
        String ioDt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        ItemMst itemMst = itemRepository.findById(itemCd).orElseThrow();
        WhMst fromWh = whMstRepository.findById(fromWhCd).orElseThrow();

        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd); itemIo.setIoDt(ioDt); itemIo.setIoType("OUT");
        itemIo.setItemMst(itemMst); itemIo.setQty(qty); itemIo.setFromWh(fromWh); itemIo.setRemark(remark);
        itemIo.setRefTb("TB_ORDER"); itemIo.setRefCd(orderCd); itemIo.setRefSeq(seqNo);
        itemIoRepository.save(itemIo);

        updateStock(itemCd, fromWhCd, BigDecimal.valueOf(qty), false);
        saveStockHistory(ioCd, itemCd, fromWhCd, "OUT", BigDecimal.valueOf(qty).negate(), "TB_ORDER", orderCd);
        orderService.updateDetailStatus(orderCd, seqNo, "o3");
        logService.saveLog("출고 관리", "등록", ioCd, "주문번호: " + orderCd + ", 품목: " + itemCd);
    }

    public List<StockHistoryDto> getStockHistory(String type, String code) {
        List<ItemStockHis> list = "ITEM".equals(type)
                ? itemStockHisRepository.findByItemCdOrderByTrxDtDesc(code)
                : itemStockHisRepository.findByWhCdOrderByTrxDtDesc(code);

        return list.stream().map(h -> {
            String custNm = h.getCustCd() != null
                    ? custRepository.findById(h.getCustCd()).map(CustMst::getCustNm).orElse("")
                    : "";
            return StockHistoryDto.builder()
                    .stkHisCd(h.getStkHisCd())
                    .ioDt(h.getTrxDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                    .ioType(h.getIoType())
                    .itemCd(h.getItemCd())
                    .whCd(h.getWhCd())
                    .qty(h.getQtyDelta())
                    .custCd(h.getCustCd())
                    .custNm(custNm)
                    .remark(h.getRemark())
                    .build();
        }).collect(Collectors.toList());
    }

    public BigDecimal getCurrentStock(String whCd, String itemCd) {
        return itemStockRepository.findById(new ItemStockId(itemCd, whCd))
                .map(ItemStock::getStockQty)
                .orElse(BigDecimal.ZERO);
    }
}