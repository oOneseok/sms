package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@ToString
@Table(name = "TB_PROCMST")
public class ProcMst {

    // 1. 공정 CD (PK)
    @Id
    @Column(name = "PROC_CD", length = 10)
    private String procCd;

    // 2. 공정명
    @Column(name = "PROC_NM", length = 50, nullable = false)
    private String procNm;

    // 3. 비고
    @Column(name = "REMARK", length = 100)
    private String remark;

    // 4. 공정 담당자
    @Column(name = "PROC_EMP", length = 20)
    private String procEmp;

    // 5. 사용여부 (Y/N)
    @Column(name = "USE_FLAG", length = 1)
    private String useFlag;
}
