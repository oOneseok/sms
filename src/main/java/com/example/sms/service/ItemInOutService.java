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

    // 참조 데이터 조회용
    private final PurchaseMstRepository purchaseMstRepository;
    private final OrderMstRepository orderMstRepository;
    private final CustRepository custRepository;

    // 상태 변경용 Service
    private final PurchaseService purchaseService;
    private final OrderService orderService;

    // ID 생성 유틸
    private String generateId(String prefix) {
        return prefix + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
    }

    /**
     * ✅ 공통: 재고 수량 업데이트
     */
    @Transactional
    public void updateStock(String itemCd, String whCd, BigDecimal qty, boolean isIncrease) {
        ItemStockId id = ItemStockId.builder().itemCd(itemCd).whCd(whCd).build();

        // 없으면 0개로 생성
        ItemStock stock = itemStockRepository.findById(id)
                .orElse(ItemStock.builder()
                        .id(id)
                        .stockQty(BigDecimal.ZERO)
                        .allocQty(BigDecimal.ZERO)
                        .build());

        BigDecimal current = stock.getStockQty();
        BigDecimal next = isIncrease ? current.add(qty) : current.subtract(qty);

        if (next.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("재고가 부족합니다. (현재: " + current + ", 요청: " + qty + ")");
        }

        stock.setStockQty(next);
        itemStockRepository.save(stock);
    }

    /**
     * ✅ 공통: 재고 이력 저장 (거래처 조회 포함)
     */
    @Transactional
    public void saveStockHistory(String ioCd, String itemCd, String whCd, String ioType, BigDecimal qtyDelta, String refTb, String refCd) {
        String custCd = null;

        if ("TB_PURCHASE".equals(refTb) && refCd != null) {
            custCd = purchaseMstRepository.findById(refCd)
                    .map(PurchaseMst::getCustCd)
                    .orElse(null);
        } else if ("TB_ORDER".equals(refTb) && refCd != null) {
            custCd = orderMstRepository.findById(refCd)
                    .map(OrderMst::getCustCd)
                    .orElse(null);
        }

        ItemStockHis history = ItemStockHis.builder()
                .stkHisCd(generateId("HIS"))
                .itemCd(itemCd)
                .whCd(whCd)
                .trxDt(LocalDateTime.now())
                .custCd(custCd)
                .ioCd(ioCd)
                .ioType(ioType)
                .qtyDelta(qtyDelta)
                .allocDelta(BigDecimal.ZERO)
                .refTb(refTb)
                .refNo(refCd)
                .remark(ioType.equals("IN") ? "입고" : "출고")
                .build();

        itemStockHisRepository.save(history);
    }

    // 입고 처리 (기존 유지)
    @Transactional
    public void registerInboundFromPurchase(String purchaseCd, Integer seqNo, String toWhCd, String itemCd, Integer qty, String remark) {
        String ioCd = generateId("IO");
        String ioDt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        ItemMst itemMst = itemRepository.findById(itemCd).orElseThrow(() -> new IllegalArgumentException("품목 오류"));
        WhMst toWh = whMstRepository.findById(toWhCd).orElseThrow(() -> new IllegalArgumentException("창고 오류"));

        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd);
        itemIo.setIoDt(ioDt);
        itemIo.setIoType("IN");
        itemIo.setItemMst(itemMst);
        itemIo.setQty(qty);
        itemIo.setToWh(toWh);
        itemIo.setRemark(remark);
        itemIo.setRefTb("TB_PURCHASE");
        itemIo.setRefCd(purchaseCd);
        itemIo.setRefSeq(seqNo);

        itemIoRepository.save(itemIo);
        updateStock(itemCd, toWhCd, BigDecimal.valueOf(qty), true);
        saveStockHistory(ioCd, itemCd, toWhCd, "IN", BigDecimal.valueOf(qty), "TB_PURCHASE", purchaseCd);
        purchaseService.updateDetailStatus(purchaseCd, seqNo, "p3");
    }

    /**
     * ✅ [수정] 주문(Order) 기반 출고 처리 (seqNo 추가)
     */
    @Transactional
    public void registerOutboundFromOrder(String orderCd, Integer seqNo, String itemCd, String fromWhCd, Integer qty, String remark) {

        // 1. 재고 확인
        ItemStockId stockId = ItemStockId.builder().itemCd(itemCd).whCd(fromWhCd).build();
        ItemStock currentStock = itemStockRepository.findById(stockId)
                .orElseThrow(() -> new IllegalArgumentException("해당 창고에 품목 정보가 없습니다."));

        if (currentStock.getStockQty().compareTo(BigDecimal.valueOf(qty)) < 0) {
            throw new IllegalArgumentException("재고가 부족합니다. (현재고: " + currentStock.getStockQty() + ")");
        }

        // 2. IO 테이블 저장
        String ioCd = generateId("IO");
        String ioDt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        ItemMst itemMst = itemRepository.findById(itemCd).orElseThrow();
        WhMst fromWh = whMstRepository.findById(fromWhCd).orElseThrow();

        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd);
        itemIo.setIoDt(ioDt);
        itemIo.setIoType("OUT");
        itemIo.setItemMst(itemMst);
        itemIo.setQty(qty);
        itemIo.setFromWh(fromWh);
        itemIo.setRemark(remark);

        itemIo.setRefTb("TB_ORDER");
        itemIo.setRefCd(orderCd);
        itemIo.setRefSeq(seqNo); // ✅ DB에 순번도 같이 저장

        itemIoRepository.save(itemIo);

        // 3. 재고 감소
        updateStock(itemCd, fromWhCd, BigDecimal.valueOf(qty), false);

        // 4. 이력 저장
        saveStockHistory(ioCd, itemCd, fromWhCd, "OUT", BigDecimal.valueOf(qty).negate(), "TB_ORDER", orderCd);

        // 5. 주문 상세 상태 변경 (o2 -> o3)
        // ✅ 여기서 itemCd 대신 seqNo를 넘김
        orderService.updateDetailStatus(orderCd, seqNo, "o3");
    }

    // 이력 조회
    public List<StockHistoryDto> getStockHistory(String type, String code) {
        List<ItemStockHis> list;
        if ("ITEM".equals(type)) {
            list = itemStockHisRepository.findByItemCdOrderByTrxDtDesc(code);
        } else {
            list = itemStockHisRepository.findByWhCdOrderByTrxDtDesc(code);
        }

        return list.stream().map(h -> {
            String custNm = "";
            if (h.getCustCd() != null) {
                custNm = custRepository.findById(h.getCustCd())
                        .map(CustMst::getCustNm).orElse("");
            }
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

    // ✅ [추가] 현재고 조회
    public BigDecimal getCurrentStock(String whCd, String itemCd) {
        return itemStockRepository.findById(new ItemStockId(itemCd, whCd))
                .map(ItemStock::getStockQty)
                .orElse(BigDecimal.ZERO);
    }

    public List<ItemInOutDto> getInOutList() {
        // ItemIoRepository에서 전체 데이터를 날짜 내림차순(최신순)으로 조회
        // (만약 findAllByOrderByIoDtDesc가 없다면 ItemIoRepository에 추가 필요)
        return itemIoRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "ioDt")).stream()
                .map(io -> ItemInOutDto.builder()
                        .ioCd(io.getIoCd())
                        .ioDt(io.getIoDt())
                        .ioType(io.getIoType()) // "IN" or "OUT"
                        .itemCd(io.getItemMst().getItemCd())
                        // .itemNm(io.getItemMst().getItemNm()) // 필요시 주석 해제
                        .qty(io.getQty())
                        // 입고(IN)면 도착창고(toWh), 출고(OUT)면 출발창고(fromWh)가 중요
                        .fromWhCd(io.getFromWh() != null ? io.getFromWh().getWhCd() : null)
                        .toWhCd(io.getToWh() != null ? io.getToWh().getWhCd() : null)
                        .refCd(io.getRefCd()) // 주문번호 or 발주번호
                        .remark(io.getRemark())
                        .build())
                .collect(Collectors.toList());
    }
}