package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ORDER")
public class Order {
    // 1. 주문 번호 (PK)
    @Id
    @Column(name = "SLIP_NO", length = 20)
    private String slipNo;

    // 2. 주문 일자
    @Column(name = "SLIP_DT", length = 10)
    private String slipDt;

    // 3. 고객사 코드
    @Column(name = "CUST_CD", length = 20)
    private String custCd;

    // 4. 제품 코드
    @Column(name = "ITEM_CD", length = 20)
    private String itemCd;

    // 5. 주문 수량
    @Column(name = "QTY")
    private Integer qty;

    // 6. 담당자 (고객사 담당자)
    @Column(name = "CUST_EMP", length = 20)
    private String custEmp;

}
