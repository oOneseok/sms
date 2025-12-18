package com.example.sms.service;

import com.example.sms.entity.LogMst;
import com.example.sms.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class LogService {

    private final LogRepository logRepository;

    /**
     * 로그 저장
     * @param menuName   메뉴명 (예: "거래처 관리")
     * @param actionType 행위 (예: "등록", "수정", "삭제")
     * @param targetKey  대상 식별자 (예: "13")
     * @param targetName 대상 이름 (예: "삼성전자")
     */
    @Transactional
    public void saveLog(String menuName, String actionType, String targetKey, String targetName) {
        // 1. 로그 번호 생성 (L + 년월일시분초밀리초)
        String logNo = "L" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmssSSS"));

        // 2. 엔티티 빌드 (변경된 LogMst 구조에 맞춤)
        LogMst log = LogMst.builder()
                .logNo(logNo)
                .menuName(menuName)     // "거래처 관리"
                .actionType(actionType) // "등록" or "수정" or "삭제"
                .targetKey(targetKey)   // ID
                .targetName(targetName) // 이름 (식별용)
                .build();

        logRepository.save(log);
    }
}