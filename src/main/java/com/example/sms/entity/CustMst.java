package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Getter
@Setter
@ToString
@Table(name = "TB_CUSTMST")
public class CustMst {
    @Id
    @Column(name = "CUST_CD", length = 20)
    private String custCd;

    @Column(name = "CUST_NM")
    private String custNm;

    @Column(name = "PRESIDENT_NM")
    private String presidentNm;

    @Column(name = "BIZ_NO")
    private String bizNo;

    @Column(name = "BIZ_COND")
    private String bizCond;

    @Column(name = "BIZ_ITEM")
    private String bizItem;

    @Column(name = "BIZ_ADDR")
    private String bizAddr;

    @Column(name = "BIZ_TEL")
    private String bizTel;

    @Column(name = "BIZ_FAX")
    private String bizFax;

    // 추가된 컬럼
    @Column(name = "EMP_CD")
    private String empCd;

    @Column(name = "EMP_NM")
    private String empNm;

    @Column(name = "EMP_EMAIL")
    private String empEmail;

    @Column(name = "EMP_TEL")
    private String empTel;

    @Column(name = "EMP_HP")
    private String empHp;

    @Column(name = "BIZ_FLAG", length = 2)
    private String bizFlag; // 01(구매), 02(판매)
}