package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ITEMSTOCK_HIS")
public class ItemStockHis {

    @Id
    @Column(name = "STK_HIS_CD", length = 30)
    private String stkHisCd;

    @Column(name = "ITEM_CD", length = 20)
    private String itemCd;

    @Column(name = "WH_CD", length = 10)
    private String whCd;

    @Column(name = "TRX_DT")
    private LocalDateTime trxDt;

    @Column(name = "CUST_CD", length = 20)
    private String custCd;

    @Column(name = "IO_CD", length = 20)
    private String ioCd;

    @Column(name = "IO_TYPE", length = 20)
    private String ioType;

    @Column(name = "QTY_DELTA", precision = 18, scale = 3)
    private BigDecimal qtyDelta;

    @Column(name = "ALLOC_DELTA", precision = 18, scale = 3)
    private BigDecimal allocDelta;

    @Column(name = "REF_TB", length = 30)
    private String refTb;

    @Column(name = "REF_NO", length = 30)
    private String refNo;

    @Column(name = "REF_SEQ")
    private Integer refSeq;

    @Column(name = "REMARK", length = 100)
    private String remark;
}
