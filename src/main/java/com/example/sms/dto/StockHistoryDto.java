package com.example.sms.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockHistoryDto {
    private String stkHisCd;    // 이력 번호
    private String ioDt;        // 날짜 (String 포맷)
    private String ioType;      // 구분 (IN/OUT)
    private String itemCd;      // 품목
    private String whCd;        // 창고
    private BigDecimal qty;     // 변동 수량 (qtyDelta)
    private BigDecimal balance; // 누적 잔고
    private String custCd;      // 거래처 코드
    private String custNm;      // 거래처 명 (화면 표시용)
    private String refNo;
    private String remark;      // 비고
}