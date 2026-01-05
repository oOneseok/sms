package com.example.sms.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class OrderDto {

    @JsonAlias({"ORDER_CD", "orderCd"})
    private String orderCd;

    @JsonAlias({"ORDER_DT", "orderDt"})
    private LocalDate orderDt;

    @JsonAlias({"CUST_CD", "custCd"})
    private String custCd;

    // ✅ 추가: 거래처명
    @JsonAlias({"CUST_NM", "custNm"})
    private String custNm;

    @JsonAlias({"CUST_EMP", "custEmp"})
    private String custEmp;

    @JsonAlias({"REMARK", "remark"})
    private String remark;
}
