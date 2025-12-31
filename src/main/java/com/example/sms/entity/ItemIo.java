package com.example.sms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;


@Entity
@Table(name = "TB_ITEM_IO")
@Getter @Setter
public class ItemIo {

    @Id
    @Column(name = "IO_CD", length = 20)
    private String ioCd;

    @Column(name = "IO_DT", length = 10)
    private String ioDt;

    @Column(name = "IO_TYPE", length = 20)
    private String ioType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ITEM_CD")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ItemMst itemMst;

    @Column(name = "QTY")
    private Integer qty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FROM_WH_CD")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WhMst fromWh;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "TO_WH_CD")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WhMst toWh;

    @Column(name = "REF_TB", length = 20)
    private String refTb;

    @Column(name = "REF_CD", length = 20)
    private String refCd;

    @Column(name = "REF_SEQ")
    private Integer refSeq;

    @Column(name = "REMARK", length = 100)
    private String remark;
}