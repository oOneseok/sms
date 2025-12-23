package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
public class ItemStockId implements Serializable {

    @Column(name = "ITEM_CD", length = 20)
    private String itemCd;

    @Column(name = "WH_CD", length = 10)
    private String whCd;
}
