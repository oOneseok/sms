package com.example.sms.entity;

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

    @Column(name = "IO_TYPE", length = 20) // - IN(입고) / OUT(출고) / RESERVE(예약 배정) / UNRESERVE(예약 배정 취소) / MOVE(단순 창고 이동) / PROD_USED(생산투입) / PROD_RESULT(생산결과)
    private String ioType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ITEM_CD")
    private ItemMst itemMst;

    @Column(name = "QTY")
    private Integer qty;

    // 출발 창고 (출고 시에는 여기가 '제품창고'가 됨)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FROM_WH_CD")
    private WhMst fromWh;

    // 도착 창고 (출고 시에는 보통 NULL이거나 고객사 가상창고)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "TO_WH_CD")
    private WhMst toWh;

    // 근거 자료 (주문번호 연결)
    @Column(name = "REF_TB", length = 20) // "TB_ORDER"
    private String refTb;

    @Column(name = "REF_CD", length = 20) // 주문번호(ORDER_CD)
    private String refCd;

    @Column(name = "REF_SEQ")
    private Integer refSeq;

    @Column(name = "REMARK", length = 100)
    private String remark;
}