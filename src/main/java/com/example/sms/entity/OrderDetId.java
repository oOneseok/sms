package com.example.sms.entity; // 혹은 entity.id 패키지 사용 시 변경

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Getter @Setter
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetId implements Serializable {

    @Column(name = "ORDER_CD")
    private String orderCd;

    @Column(name = "SEQ_NO")
    private Integer seqNo;
}