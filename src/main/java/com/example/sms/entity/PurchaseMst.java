package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@ToString
@Table(name = "TB_PURCHASE")
public class PurchaseMst {

    // 발주번호 (PK)
    @Id
    @Column(name = "PURCHASE_CD", length = 20)
    private String purchaseCd;

    // 발주일자
    @Column(name = "PURCHASE_DT", nullable = false)
    private LocalDate purchaseDt;

    // 거래처 코드 (FK지만 문자열로만 관리)
    @Column(name = "CUST_CD", length = 10)
    private String custCd;

    // 거래처 담당자 (직접 입력)
    @Column(name = "CUST_EMP", length = 50)
    private String custEmp;

    // 비고
    @Column(name = "REMARK", length = 200)
    private String remark;
}
