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
    @Id
    @Column(name = "PROC_CD", length = 10)
    private String procCd;

    @Column(name = "PROC_NM")
    private String procNm;

    @Column(name = "PROC_EMP")
    private String procEmp;

    @Column(name = "USE_FLAG", length = 1)
    private String useFlag; // Y/N

    @Column(name = "REMARK")
    private String remark;
}