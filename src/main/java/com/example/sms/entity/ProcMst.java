package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_PROCMST")
public class ProcMst {

    // 공정 코드 (PK)
    @Id
    @Column(name = "PROC_CD", length = 10)
    private String procCd;

    // 공정명
    @Column(name = "PROC_NM", length = 50)
    private String procNm;

    // 공정 담당자
    @Column(name = "PROC_EMP", length = 20)
    private String procEmp;

    // 사용 여부 (Y/N)
    @Column(name = "USE_FLAG", length = 1)
    private String useFlag;

    // 비고 (설명)
    @Column(name = "REMARK", length = 100)
    private String remark;
}