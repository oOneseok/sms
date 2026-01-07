package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_PROD")
public class Prod {

    @Id
    @Column(name = "PROD_NO", length = 30)
    private String prodNo;

    @Column(name = "PROD_DT", length = 20) // ✅ 문자
    private String prodDt;

    @Column(name = "ITEM_CD", length = 20)
    private String itemCd; // ✅ TB_ITEMMST.ITEM_CD (ITEM_FLAG=02 제품만)

    @Column(name = "PLAN_QTY", precision = 18, scale = 3)
    private BigDecimal planQty;

    @Column(name = "STATUS", length = 2)
    private String status; // 01/02/03/04/05/09

    @Column(name = "REMARK", length = 100)
    private String remark;
}
