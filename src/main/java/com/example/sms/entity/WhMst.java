package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_WHMST")
public class WhMst {

    // 창고코드
    @Id
    @Column(name = "WH_CD", length = 10)
    private String whCd;

    // 창고명
    @Column(name = "WH_NM", length = 50, nullable = false)
    private String whNm;

    // 창고유형1
    @Column(name = "WH_TYPE1", length = 1)
    private String whType1;

    // 창고유형2
    @Column(name = "WH_TYPE2", length = 1)
    private String whType2;

    // 사용여부
    @Column(name = "USE_FLAG", length = 1)
    private String useFlag;
}
