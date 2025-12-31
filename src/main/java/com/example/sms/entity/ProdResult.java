package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_PROD_RESULT")
public class ProdResult {

    @EmbeddedId
    private ProdResultId id;

    @Column(name = "RESULT_DT")
    private LocalDate resultDt;

    @Column(name = "WH_CD", length = 10)
    private String whCd; // TB_WHMST

    @Column(name = "GOOD_QTY", precision = 18, scale = 3)
    private BigDecimal goodQty;

    @Column(name = "BAD_QTY", precision = 18, scale = 3)
    private BigDecimal badQty;

    @Column(name = "BAD_RES", length = 100)
    private String badRes;

    @Column(name = "REMARK", length = 100)
    private String remark;
}
