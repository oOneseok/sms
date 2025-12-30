package com.example.sms.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
public class ProdReceiveReq {
    private String whCd;
    private BigDecimal qty; // null이면 실적 good 합으로
    private String remark;  // 선택
}
