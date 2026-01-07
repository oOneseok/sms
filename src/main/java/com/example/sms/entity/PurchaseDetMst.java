package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Getter
@Setter
@ToString
@Table(name = "TB_PURCHASE_DET")
public class PurchaseDetMst {

    // 복합 PK (PURCHASE_CD + SEQ_NO)
    @EmbeddedId
    private PurchaseDetIdMst id;

    // 품목코드 (ITEM_FLAG = '01'은 서비스단에서 체크)
    @Column(name = "ITEM_CD", length = 10, nullable = false)
    private String itemCd;

    // 발주 수량
    @Column(name = "PURCHASE_QTY", nullable = false)
    private Integer purchaseQty;

    // 상태 (p1:등록 / p2:확정 / p9:취소)
    @Column(name = "STATUS", length = 2, nullable = false)
    private String status;

    //창고 코드
    @Column(name = "WH_CD", length = 10)
    private String whCd;

    //단가
    @Column(name = "ITEM_COST")
    private Integer itemCost;

    // 비고
    @Column(name = "REMARK", length = 200)
    private String remark;
}
