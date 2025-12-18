package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_LOG") // 사진에서 테이블명이 소문자 log
public class Log {

    // 로그번호 (PK)
    @Id
    @Column(name = "LOG_NO", length = 20)
    private String logNo;

    // 로그 일자
    @Column(name = "LOG_CA")
    private LocalDate logCa;

    // 로그 대상 테이블명
    @Column(name = "LOG_TABLE", length = 20)
    private String logTable;

    // 로그 관련 식별값/상품? (사진 컬럼명 그대로)
    @Column(name = "LOG_PROD", length = 20)
    private String logProd;
}
