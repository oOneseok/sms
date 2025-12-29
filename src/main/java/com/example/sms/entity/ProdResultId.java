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
public class ProdResultId implements Serializable {

    @Column(name = "PROD_NO", length = 30)
    private String prodNo;

    @Column(name = "SEQ_NO")
    private Integer seqNo;
}
