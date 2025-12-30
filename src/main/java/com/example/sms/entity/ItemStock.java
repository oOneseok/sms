package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ITEMSTOCK")
public class ItemStock {

    @EmbeddedId
    private ItemStockId id;

    @Column(name = "STOCK_QTY", precision = 18, scale = 3)
    private BigDecimal stockQty;

    @Column(name = "ALLOC_QTY", precision = 18, scale = 3)
    private BigDecimal allocQty;

}
