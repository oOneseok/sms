package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_COMPMST")
public class CompMst {

    @Id
    @Column(name = "COMP_CD", length = 20)
    private String compCd;

    @Column(name = "COMP_NM")
    private String compNm;

    @Column(name = "REPRESENT_NM")
    private String representNm;

    @Column(name = "BIZ_NO")
    private String bizNo;

    @Column(name = "BIZ_TYPE")
    private String bizType;

    @Column(name = "BIZ_ITEM")
    private String bizItem;

    @Column(name = "ADDR")
    private String addr;

    @Column(name = "TEL_NO")
    private String telNo;

    @Column(name = "FAX_NO")
    private String faxNo;

    @Lob
    @Column(name = "COMP_IMG", columnDefinition = "CLOB")
    private String compImg;
}
