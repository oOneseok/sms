package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@Setter
public class OrderDetIdMst implements Serializable {

    @Column(name = "ORDER_CD", length = 20)
    private String orderCd;

    @Column(name = "SEQ_NO")
    private Integer seqNo;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderDetIdMst)) return false;
        OrderDetIdMst that = (OrderDetIdMst) o;
        return Objects.equals(orderCd, that.orderCd)
                && Objects.equals(seqNo, that.seqNo);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderCd, seqNo);
    }
}