package com.example.sms.controller;

import com.example.sms.dto.LoginRequestDto;
import com.example.sms.entity.UserMst;
import com.example.sms.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse; // ✅ 추가
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository; // ✅ 추가
import org.springframework.security.web.context.SecurityContextRepository;         // ✅ 추가
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
// @CrossOrigin 제거 (WebMvcConfig에서 전역 설정 권장)
public class UserController {

    private final UserRepository userRepository;

    // ✅ [핵심 1] 세션 저장소 도구 생성
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto loginDto,
                                   HttpServletRequest request,
                                   HttpServletResponse response) { // ✅ response 파라미터 필요

        // 1. ID/PW 검증
        Optional<UserMst> userOpt = userRepository.findByUserId(loginDto.getUserId());
        if (userOpt.isEmpty() || !userOpt.get().getPswd().equals(loginDto.getPswd())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "아이디 또는 비밀번호가 잘못되었습니다."));
        }
        UserMst user = userOpt.get();

        // 2. 인증 토큰 생성
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.getUserId(), null, AuthorityUtils.createAuthorityList("ROLE_USER")
        );

        // 3. Context 생성 및 설정
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        // 🚨 [핵심 2] 여기가 중요합니다!
        // 기존의 session.setAttribute(...) 코드를 지우고 아래 코드를 쓰세요.
        // 이것이 스프링 시큐리티에게 "세션에 저장하고 JSESSIONID 쿠키를 구워라"라고 명령하는 정석 코드입니다.
        securityContextRepository.saveContext(context, request, response);

        System.out.println("✅ 로그인 성공 & SecurityContextRepository 저장 완료: " + user.getUserId());

        return ResponseEntity.ok(Map.of(
                "message", "로그인 성공",
                "userId", user.getUserId(),
                "userNm", user.getUserNm()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(Map.of("message", "로그아웃 성공"));
    }
}