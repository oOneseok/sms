package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ITEMMST")
public class ItemMst {
    @Id
    @Column(name = "ITEM_CD", length = 20)
    private String itemCd;

    @Column(name = "ITEM_NM")
    private String itemNm;

    @Column(name = "ITEM_FLAG", length = 2)
    private String itemFlag; // 01(자재), 02(제품)

    @Column(name = "ITEM_SPEC")
    private String itemSpec;

    @Column(name = "ITEM_UNIT")
    private String itemUnit;

    @Column(name = "ITEM_COST")
    private Double itemCost; // 단가 (소수점 가능성 대비)

    // 추가된 컬럼
    @Column(name = "MIN_QTY")
    private Integer minQty;

    @Column(name = "MAX_QTY")
    private Integer maxQty;

    @Column(name = "REMARK")
    private String remark;

    // [추가] 분류 코드 연결
    @Column(name = "TYPE_CD")
    private String typeCd;
}