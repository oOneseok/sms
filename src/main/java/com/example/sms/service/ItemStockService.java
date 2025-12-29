package com.example.sms.service;

import com.example.sms.entity.ItemStock;
import com.example.sms.entity.ItemStockHis;
import com.example.sms.entity.ItemStockId;
import com.example.sms.repository.ItemStockHisRepository;
import com.example.sms.repository.ItemStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ItemStockService {

    private final ItemStockRepository stockRepository;
    private final ItemStockHisRepository hisRepository;

    /**
     * 재고 변동 처리 (입고/출고 공통)
     * @param itemCd 품목코드
     * @param whCd 창고코드
     * @param qty 변동수량 (양수: 입고, 음수: 출고)
     * @param ioType 입출고유형 (예: PURCHASE_IN, PROD_OUT)
     * @param refNo 관련번호 (발주번호 등)
     */
    @Transactional
    public void adjustStock(String itemCd, String whCd, BigDecimal qty, String ioType, String refNo) {
        ItemStockId id = new ItemStockId(itemCd, whCd);

        // 1. 현재 재고 조회 (없으면 0으로 생성)
        ItemStock stock = stockRepository.findById(id)
                .orElse(ItemStock.builder()
                        .id(id)
                        .stockQty(BigDecimal.ZERO)
                        .allocQty(BigDecimal.ZERO)
                        .build());

        // 2. 수량 변경
        BigDecimal prevQty = stock.getStockQty();
        BigDecimal newQty = prevQty.add(qty);

        // (선택) 출고 시 재고 부족 체크
        if (newQty.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("재고 부족: " + itemCd + " (현재: " + prevQty + ")");
        }

        // 3. 재고 업데이트
        ItemStock updatedStock = ItemStock.builder()
                .id(id)
                .stockQty(newQty)
                .allocQty(stock.getAllocQty()) // 할당량은 그대로 유지 (필요시 별도 로직)
                .build();
        stockRepository.save(updatedStock);

        // 4. 이력(History) 기록
        ItemStockHis his = ItemStockHis.builder()
                .stkHisCd(UUID.randomUUID().toString()) // 이력 고유 ID
                .itemCd(itemCd)
                .whCd(whCd)
                .trxDt(LocalDateTime.now())
                .ioType(ioType)
                .qtyDelta(qty)
                .refNo(refNo)
                .remark("재고 변동 자동 처리")
                .build();

        hisRepository.save(his);
    }
}