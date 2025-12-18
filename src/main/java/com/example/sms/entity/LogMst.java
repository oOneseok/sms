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
@Table(name = "TB_LOG")
public class LogMst {

    // 로그번호 (PK) - 예: "L251219001"
    @Id
    @Column(name = "LOG_NO", length = 20)
    private String logNo;

    // 1. [변경] 로그 일시
    // LocalDate는 시간(시:분:초)이 안 남습니다. 로그는 시간이 생명이므로 LocalDateTime으로 변경했습니다.
    @CreationTimestamp
    @Column(name = "LOG_DT", updatable = false)
    private LocalDateTime logDt;

    // 2. [신규] 행위 유형
    // 예: "등록", "수정", "삭제" (또는 "INSERT", "UPDATE"...)
    @Column(name = "ACTION_TYPE", length = 10)
    private String actionType;

    // 3. [변경] 메뉴/페이지 이름 (기존 logTable 대체)
    // 예: "거래처 관리", "사용자 관리" (TB_COMPMST 같은 영어 테이블명 X)
    @Column(name = "MENU_NAME", length = 50)
    private String menuName;

    // 4. [변경] 식별 코드 (Key) (기존 logProd 대체)
    // 예: "13", "user_01" (대상의 ID 값)
    @Column(name = "TARGET_KEY", length = 50)
    private String targetKey;

    // 5. [신규] 대상 이름 (Key만 보면 모르니까 추가)
    // 예: "삼성전자", "홍길동" (식별 코드 13번이 누구인지 명시)
    @Column(name = "TARGET_NAME", length = 100)
    private String targetName;

    // 6. [추천] 변경 내용 상세 (선택 사항)
    // 예: "연락처 변경: 010-1111 -> 010-2222" (JSON이나 텍스트로 저장)
    @Lob // 긴 텍스트 저장을 위해 설정
    @Column(name = "CHANGE_CONTENTS")
    private String changeContents;
}