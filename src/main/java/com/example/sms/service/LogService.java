package com.example.sms.service;

import com.example.sms.entity.LogMst;
import com.example.sms.repository.LogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;         // ✅ 추가됨
import org.springframework.security.core.context.SecurityContextHolder; // ✅ 추가됨
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
     */
    @Transactional
    public void saveLog(String menuName, String actionType, String targetKey, String targetName) {
        saveLog(menuName, actionType, targetKey, targetName, null);
    }

    /**
     * ✅ [메소드 2] 상세 내용 포함 (파라미터 5개)
     */
    @Transactional
    public void saveLog(String menuName, String actionType, String targetKey, String targetName, String contents) {

        // 1. 기본값 anonymous 설정
        String userId = "anonymous";

        // ✅ [수정] 1순위: Spring Security 컨텍스트 확인 (가장 정확함)
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                String name = auth.getName();
                // Spring Security는 비로그인 상태일 때 "anonymousUser"라는 문자열을 줍니다.
                // 이것이 아닐 때만 실제 유저 ID로 간주합니다.
                if (!"anonymousUser".equals(name)) {
                    userId = name;
                }
            }
        } catch (Exception e) {
            // 시큐리티 컨텍스트 접근 실패 시 무시하고 다음 단계로 (세션 확인 등)
        }

        // 2. 요청 정보 가져오기 (웹 요청인 경우)
        HttpServletRequest req = null;
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                req = attrs.getRequest();
            }
        } catch (Exception e) {
            // Request가 없는 경우 무시
        }

        // 3. 보조 수단 확인 (Spring Security에서 못 찾았고, userId가 여전히 anonymous일 때)
        if ("anonymous".equals(userId) && req != null) {
            // A. 기존 레거시 세션 방식 확인
            HttpSession session = req.getSession(false);
            if (session != null && session.getAttribute("LOGIN_USER_ID") != null) {
                userId = (String) session.getAttribute("LOGIN_USER_ID");
            }
            // B. 헤더 확인
            else {
                String headerUser = req.getHeader("X-USER-ID");
                if (headerUser != null && !headerUser.isBlank()) {
                    userId = headerUser;
                }
            }
        }

        // 4. 로그 번호 생성
        String logNo = "L" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmssSSS"));

        // 5. 저장
        LogMst log = LogMst.builder()
                .logNo(logNo)
                .logDt(LocalDateTime.now())
                .menuName(menuName)
                .actionType(actionType)
                .targetKey(targetKey)
                .targetName(targetName)
                .changeContents(contents)
                .logUser(userId) // 찾아낸 ID 저장
                .build();

        logRepository.save(log);
    }
}