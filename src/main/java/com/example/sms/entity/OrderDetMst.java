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

    @EmbeddedId
    private OrderDetIdMst id;

    @Column(name = "ITEM_CD", length = 10, nullable = false)
    private String itemCd;

    @Column(name = "ORDER_QTY", nullable = false)
    private Integer orderQty;

    // ✅ [추가] 출고창고
    @Column(name = "WH_CD", length = 10)
    private String whCd;

    @Column(name = "STATUS", length = 2, nullable = false)
    private String status;

    @Column(name = "REMARK", length = 200)
    private String remark;
}
