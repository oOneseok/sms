package com.example.sms.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter
public class ProdResultSaveReq {

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate resultDt;

    // ✅ TB_PROD_RESULT.WH_CD 가 NOT NULL이면 필수
    private String whCd;

    private BigDecimal goodQty;
    private BigDecimal badQty;
    private String badRes;
    private String remark;
}
