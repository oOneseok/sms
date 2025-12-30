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
@Table(name = "TB_ORDER_DET")
public class OrderDetMst {

    // 복합 PK (ORDER_CD + SEQ_NO)
    @EmbeddedId
    private OrderDetIdMst id;

    // ✅ [변경] 아이템 코드는 일반 컬럼으로 관리
    @Column(name = "ITEM_CD", length = 10, nullable = false)
    private String itemCd;

    @Column(name = "ORDER_QTY", nullable = false)
    private Integer orderQty;

    @Column(name = "STATUS", length = 2, nullable = false)
    private String status;

    @Column(name = "REMARK", length = 200)
    private String remark;
}