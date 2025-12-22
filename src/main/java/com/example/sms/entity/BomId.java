package com.example.sms.entity;

import lombok.*;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BomId implements Serializable {
    // BomMst의 @Id 필드명과 정확히 일치해야 합니다.
    private String pItemCd;
    private String sItemCd;
    private Integer seqNo;
}