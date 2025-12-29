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
public class PurchaseDetIdMst implements Serializable {

    @Column(name = "PURCHASE_CD", length = 20)
    private String purchaseCd;

    @Column(name = "SEQ_NO")
    private Integer seqNo;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PurchaseDetIdMst)) return false;
        PurchaseDetIdMst that = (PurchaseDetIdMst) o;
        return Objects.equals(purchaseCd, that.purchaseCd)
                && Objects.equals(seqNo, that.seqNo);
    }

    @Override
    public int hashCode() {
        return Objects.hash(purchaseCd, seqNo);
    }
}
