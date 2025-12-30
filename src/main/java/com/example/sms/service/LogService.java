package com.example.sms.service;

import com.example.sms.entity.LogMst;
import com.example.sms.repository.LogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class LogService {

    private final LogRepository logRepository;

    /**
     * ✅ [메소드 1] 기존 코드 호환용 (파라미터 4개)
     * CompController, ItemController 등에서 사용
     */
    @Transactional
    public void saveLog(String menuName, String actionType, String targetKey, String targetName) {
        // 상세 내용(contents) 없이 호출
        saveLog(menuName, actionType, targetKey, targetName, null);
    }

    /**
     * ✅ [메소드 2] 상세 내용 포함 (파라미터 5개)
     * OrderService, PurchaseService 등에서 상세 품목 기록할 때 사용
     */
    @Transactional
    public void saveLog(String menuName, String actionType, String targetKey, String targetName, String contents) {

        // 1. 요청 정보 가져오기
        HttpServletRequest req = null;
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                req = attrs.getRequest();
            }
        } catch (Exception e) {
            // Request가 없는 경우 무시
        }

        // 2. 사용자 ID 식별 (세션 -> 헤더 -> anonymous)
        String userId = "anonymous";

        if (req != null) {
            // A. 세션 확인 (가장 정확함)
            HttpSession session = req.getSession(false);
            if (session != null && session.getAttribute("LOGIN_USER_ID") != null) {
                userId = (String) session.getAttribute("LOGIN_USER_ID");
            }
            // B. 헤더 확인 (세션 없을 때 보조 수단)
            else {
                String headerUser = req.getHeader("X-USER-ID");
                if (headerUser != null && !headerUser.isBlank()) {
                    userId = headerUser;
                }
            }
        }

        // 3. 로그 번호 생성
        String logNo = "L" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmssSSS"));

        // 4. 저장
        LogMst log = LogMst.builder()
                .logNo(logNo)
                .logDt(LocalDateTime.now())
                .menuName(menuName)
                .actionType(actionType)
                .targetKey(targetKey)
                .targetName(targetName)
                .changeContents(contents) // ✅ 상세 내용 저장 (null 가능)
                .logUser(userId)          // ✅ 식별된 사용자 저장
                .build();

        logRepository.save(log);
    }
}