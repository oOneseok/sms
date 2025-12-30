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

    @Id
    @Column(name = "LOG_NO", length = 20)
    private String logNo;

    @CreationTimestamp
    @Column(name = "LOG_DT", updatable = false)
    private LocalDateTime logDt;

    @Column(name = "LOG_USER", length = 20)
    private String logUser;

    @Column(name = "ACTION_TYPE", length = 10)
    private String actionType;

    @Column(name = "MENU_NAME", length = 50)
    private String menuName;

    @Column(name = "TARGET_KEY", length = 50)
    private String targetKey;

    @Column(name = "TARGET_NAME", length = 100)
    private String targetName;

    // ✅ 상세 내용 (주문 품목 리스트 등을 저장)
    @Lob
    @Column(name = "CHANGE_CONTENTS", columnDefinition = "TEXT") // DB에 따라 TEXT 또는 CLOB
    private String changeContents;
}