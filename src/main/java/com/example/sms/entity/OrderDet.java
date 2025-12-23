package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "TB_ORDER_DET")
@Getter @Setter
public class OrderDet {

    @EmbeddedId
    private OrderDetId id;

    // [중요] 복합키의 orderCd를 이용해 헤더와 연결 (@MapsId)
    @MapsId("orderCd")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ORDER_CD")
    private Order order;

    // 제품 정보 (FK)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ITEM_CD")
    private ItemMst itemMst;

    @Column(name = "ORDER_QTY")
    private Integer orderQty;

    @Column(name = "STATUS", length = 10) // o1:등록, o2:확정 ...
    private String status;

    @Column(name = "REMARK", length = 100)
    private String remark;
}