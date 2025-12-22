package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_WHMST")
public class WhMst {
    @Id
    @Column(name = "WH_CD", length = 10)
    private String whCd;

    @Column(name = "WH_NM", length = 50)
    private String whNm;

    // 변경됨: 3개 컬럼 -> 1개 컬럼 (01:자재, 02:제품, 03:혼합, 04:반품)
    @Column(name = "WH_TYPE", length = 2)
    private String whType;

    @Column(name = "USE_FLAG", length = 1)
    private String useFlag; // Y, N

    @Column(name = "REMARK", length = 100)
    private String remark;
}