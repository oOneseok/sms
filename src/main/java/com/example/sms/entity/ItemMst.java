package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ITEMMST")
public class ItemMst {

    @Id
    @Column(name = "ITEM_CD", length = 20)
    private String itemCd;

    @Column(name = "ITEM_NM", length = 100)
    private String itemNm;

    // 01: 자재, 02: 제품
    @Column(name = "ITEM_FLAG", length = 2)
    private String itemFlag;

    // 거래처 코드 (나중에 팝업으로 연결 가능)
    @Column(name = "CUST_CD", length = 20)
    private String custCd;

    @Column(name = "ITEM_SPEC", length = 100)
    private String itemSpec;

    @Column(name = "ITEM_UNIT", length = 10)
    private String itemUnit;

    @Column(name = "ITEM_COST")
    private Long itemCost; // 금액은 Long이나 BigDecimal 추천

    @Column(name = "REMARK", length = 200)
    private String remark;
}