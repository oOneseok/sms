package com.example.sms.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter
public class ProdSaveReq {
    private String prodNo;     // 문자
    private LocalDate prodDt;  // date
    private String itemCd;     // 제품(ITEM_FLAG=02)
    private BigDecimal planQty;
    private String status;     // 없으면 01로
    private String remark;
}
