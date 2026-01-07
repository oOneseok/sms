package com.example.sms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseDetDto {
    private Integer seqNo;
    private String itemCd;
    private String itemNm;    // 자재명 (추가됨)
    private String itemSpec;  // 규격 (추가됨)
    private String itemUnit;  // 단위 (추가됨)
    private Integer purchaseQty;
    private Integer itemCost;
    private String status;
    private String whCd;
    private String remark;
}