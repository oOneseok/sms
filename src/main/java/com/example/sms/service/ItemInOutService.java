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
    private final PurchaseService purchaseService;
    private final PurchaseMstRepository purchaseMstRepository; // 거래처 조회를 위해 필요
    private final CustRepository custRepository;

    // 1. 전체 목록 조회
    public List<ItemInOutDto> getInOutList() {
        return itemIoRepository.findAllByOrderByIoDtDescIoCdDesc().stream()
                .map(io -> ItemInOutDto.builder()
                        .id(io.getIoCd())
                        .ioCd(io.getIoCd())
                        .ioDt(io.getIoDt())
                        .ioType(io.getIoType())
                        .itemCd(io.getItemMst() != null ? io.getItemMst().getItemCd() : null)
                        .qty(io.getQty())
                        .fromWhCd(io.getFromWh() != null ? io.getFromWh().getWhCd() : null)
                        .toWhCd(io.getToWh() != null ? io.getToWh().getWhCd() : null)
                        .remark(io.getRemark())

                        .refCd(io.getRefCd())

                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void registerInboundFromPurchase(String purchaseCd, Integer seqNo, String toWhCd, String itemCd, Integer qty, String remark) {

        // (1) 입고 이력(IO) 생성 준비
        String ioCd = generateId("IO");
        String ioDt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        ItemMst itemMst = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("품목 없음: " + itemCd));
        WhMst toWh = whMstRepository.findById(toWhCd)
                .orElseThrow(() -> new IllegalArgumentException("창고 없음: " + toWhCd));

        // (2) IO 테이블 저장
        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd);
        itemIo.setIoDt(ioDt);
        itemIo.setIoType("IN"); // 입고
        itemIo.setItemMst(itemMst);
        itemIo.setQty(qty);
        itemIo.setToWh(toWh);
        itemIo.setRemark(remark);
        itemIo.setRefTb("TB_PURCHASE"); // 근거: 발주테이블
        itemIo.setRefCd(purchaseCd);    // 발주번호
        itemIo.setRefSeq(seqNo);        // 발주순번

        itemIoRepository.save(itemIo);

        // (3) 재고(Stock) 증가
        updateStock(itemCd, toWhCd, BigDecimal.valueOf(qty), true);

        // (4) 재고 이력(History) 저장
        saveStockHistory(ioCd, itemCd, toWhCd, "IN", BigDecimal.valueOf(qty));

        // (5) 발주 상세 상태 변경 (p2 -> p3 입고완료)
        purchaseService.updateDetailStatus(purchaseCd, seqNo, "p3");
    }

    // 2. 입고 (IN) 처리
    @Transactional
    public void registerInbound(ItemInOutDto dto) {
        String ioCd = generateId("IO");
        String ioDt = (dto.getIoDt() != null && !dto.getIoDt().isEmpty())
                ? dto.getIoDt()
                : LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        Integer qty = dto.getQty();

        // [수정됨] itemRepository.findById 사용 (자동으로 있음)
        ItemMst itemMst = itemRepository.findById(dto.getItemCd())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목입니다: " + dto.getItemCd()));

        WhMst toWh = whMstRepository.findById(dto.getToWhCd())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 창고입니다: " + dto.getToWhCd()));

        // IO 엔티티 생성 및 저장
        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd);
        itemIo.setIoDt(ioDt);
        itemIo.setIoType("IN");
        itemIo.setItemMst(itemMst);
        itemIo.setQty(qty);
        itemIo.setToWh(toWh);
        itemIo.setRemark(dto.getRemark());

        itemIoRepository.save(itemIo);

        // 재고 증가
        updateStock(dto.getItemCd(), dto.getToWhCd(), BigDecimal.valueOf(qty), true);

        // 이력 저장
        saveStockHistory(ioCd, dto.getItemCd(), dto.getToWhCd(), "IN", BigDecimal.valueOf(qty));
    }

    // 3. 출고 (OUT) 처리
    @Transactional
    public void registerOutbound(ItemInOutDto dto) {
        String ioCd = generateId("IO");
        String ioDt = (dto.getIoDt() != null && !dto.getIoDt().isEmpty())
                ? dto.getIoDt()
                : LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        Integer qty = dto.getQty();
        BigDecimal qtyBd = BigDecimal.valueOf(qty);

        // 재고 확인
        ItemStockId stockId = ItemStockId.builder()
                .itemCd(dto.getItemCd())
                .whCd(dto.getFromWhCd())
                .build();

        ItemStock currentStock = itemStockRepository.findById(stockId)
                .orElseThrow(() -> new IllegalArgumentException("해당 창고에 품목 재고가 없습니다."));

        if (currentStock.getStockQty().compareTo(qtyBd) < 0) {
            throw new IllegalArgumentException("재고가 부족합니다. (현재: " + currentStock.getStockQty() + ")");
        }

        // [수정됨] itemRepository.findById 사용
        ItemMst itemMst = itemRepository.findById(dto.getItemCd())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목입니다."));

        WhMst fromWh = whMstRepository.findById(dto.getFromWhCd())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 창고입니다."));

        // IO 저장
        ItemIo itemIo = new ItemIo();
        itemIo.setIoCd(ioCd);
        itemIo.setIoDt(ioDt);
        itemIo.setIoType("OUT");
        itemIo.setItemMst(itemMst);
        itemIo.setQty(qty);
        itemIo.setFromWh(fromWh);
        itemIo.setRemark(dto.getRemark());

        itemIoRepository.save(itemIo);

        // 재고 감소
        updateStock(dto.getItemCd(), dto.getFromWhCd(), qtyBd, false);

        // 이력 저장
        saveStockHistory(ioCd, dto.getItemCd(), dto.getFromWhCd(), "OUT", qtyBd.negate());
    }

    // --- Helper Methods ---

    private void updateStock(String itemCd, String whCd, BigDecimal qty, boolean isIncrease) {
        ItemStockId id = ItemStockId.builder().itemCd(itemCd).whCd(whCd).build();

        ItemStock stock = itemStockRepository.findById(id)
                .orElse(ItemStock.builder()
                        .id(id)
                        .stockQty(BigDecimal.ZERO)
                        .allocQty(BigDecimal.ZERO)
                        .build());

        BigDecimal newQty = isIncrease
                ? stock.getStockQty().add(qty)
                : stock.getStockQty().subtract(qty);

        ItemStock updatedStock = ItemStock.builder()
                .id(stock.getId())
                .stockQty(newQty)
                .allocQty(stock.getAllocQty())
                .build();

        itemStockRepository.save(updatedStock);
    }

    private void saveStockHistory(String ioCd, String itemCd, String whCd, String ioType, BigDecimal qtyDelta) {
        ItemStockHis history = ItemStockHis.builder()
                .stkHisCd(generateId("HIS"))
                .itemCd(itemCd)
                .whCd(whCd)
                .trxDt(LocalDateTime.now())
                .ioCd(ioCd)
                .ioType(ioType)
                .qtyDelta(qtyDelta)
                .allocDelta(BigDecimal.ZERO)
                .refTb("TB_ITEM_IO")
                .build();
        itemStockHisRepository.save(history);
    }

    private String generateId(String prefix) {
        return prefix + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
    }

    @Transactional
    public void saveStockHistory(String ioCd, String itemCd, String whCd, String ioType, BigDecimal qtyDelta, String refTb, String refCd) {

        String custCd = null;

        // 1. 발주(Purchase) 기반 입고라면 거래처(CUST_CD)를 찾아온다.
        if ("TB_PURCHASE".equals(refTb) && refCd != null) {
            custCd = purchaseMstRepository.findById(refCd)
                    .map(PurchaseMst::getCustCd)
                    .orElse(null);
        }
        // TODO: 출고(ORDER) 기반이라면 TB_ORDER에서 찾아오는 로직 추가 가능

        ItemStockHis history = ItemStockHis.builder()
                .stkHisCd(generateId("HIS"))
                .itemCd(itemCd)
                .whCd(whCd)
                .trxDt(LocalDateTime.now()) // 현재 시간
                .custCd(custCd)             // 거래처
                .ioCd(ioCd)
                .ioType(ioType)
                .qtyDelta(qtyDelta)         // 변동 수량 (+/-)
                .allocDelta(BigDecimal.ZERO)
                .refTb(refTb)
                .refNo(refCd)
                .remark(ioType.equals("IN") ? "입고" : "출고")
                .build();

        itemStockHisRepository.save(history);
    }

    /**
     * ✅ [추가됨] 재고 이력 조회 (화면 표시용)
     */
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

}