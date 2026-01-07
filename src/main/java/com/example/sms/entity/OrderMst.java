package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.util.List;

@Entity
@Getter
@Setter
@ToString
@Table(name = "TB_ORDER")
public class OrderMst {

    @Id
    @Column(name = "ORDER_CD", length = 20)
    private String orderCd;

    @Column(name = "ORDER_DT", nullable = false)
    private LocalDate orderDt;

    @Column(name = "CUST_CD", length = 10)
    private String custCd;

    @Column(name = "CUST_EMP", length = 50)
    private String custEmp;

    @Column(name = "REMARK", length = 200)
    private String remark;

    // ✅ 프론트엔드 전달용 (DB 매핑 X)
    @Transient
    private List<OrderDetMst> details;
}
