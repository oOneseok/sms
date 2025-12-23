package com.example.sms.service;

import com.example.sms.entity.LogMst;
import com.example.sms.repository.LogRepository;
import jakarta.servlet.http.HttpServletRequest; // ✅ 추가
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder; // ✅ 추가
import org.springframework.web.context.request.ServletRequestAttributes; // ✅ 추가

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class LogService {

    private final LogRepository logRepository;

    /**
     * 로그 저장 (userId 파라미터 제거됨!)
     */
    @Transactional
    public void saveLog(String menuName, String actionType, String targetKey, String targetName) {

        // 1. 🔥 [핵심] 현재 요청(Request) 객체를 공중에서 낚아챔
        HttpServletRequest req = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();

        // 2. 헤더에서 "X-USER-ID" 값을 꺼냄 (없으면 anonymous)
        String userId = req.getHeader("X-USER-ID");
        if (userId == null || userId.isEmpty()) {
            userId = "anonymous";
        }

        // 3. 로그 번호 생성
        String logNo = "L" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMddHHmmssSSS"));

        // 4. 엔티티 빌드
        LogMst log = LogMst.builder()
                .logNo(logNo)
                .logDt(LocalDateTime.now())
                .menuName(menuName)
                .actionType(actionType)
                .targetKey(targetKey)
                .targetName(targetName)
                .logUser(userId)
                .build();

        logRepository.save(log);
    }
}