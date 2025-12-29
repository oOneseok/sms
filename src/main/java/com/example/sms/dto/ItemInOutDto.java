package com.example.sms.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemInOutDto {
    private String id;       // 프론트엔드 Key
    private String ioCd;     // 입출고 번호
    private String ioDt;     // 날짜
    private String ioType;   // 구분 (IN/OUT)
    private String itemCd;   // 품목
    private Integer qty;     // 수량
    private String fromWhCd; // 출발 창고
    private String toWhCd;   // 도착 창고
    private String remark;   // 비고

    private String refCd;
}