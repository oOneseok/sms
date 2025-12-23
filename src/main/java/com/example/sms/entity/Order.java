package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "TB_ORDER")
@Getter @Setter
public class Order {

    @Id
    @Column(name = "ORDER_CD", length = 20)
    private String orderCd;

    @Column(name = "ORDER_DT", length = 10)
    private String orderDt;

    // 고객사 정보 (FK)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CUST_CD")
    private CustMst custMst;

    @Column(name = "CUST_EMP", length = 20)
    private String custEmp;

    @Column(name = "REMARK", length = 100)
    private String remark;
}