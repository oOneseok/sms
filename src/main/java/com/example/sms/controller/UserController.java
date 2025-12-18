package com.example.sms.controller;

import com.example.sms.dto.LoginRequestDto;
import com.example.sms.entity.UserMst;
import com.example.sms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto loginDto) {
        // 1. ID로 사용자 조회
        Optional<UserMst> user = userRepository.findByUserId(loginDto.getUserId());

        // 2. 사용자가 없거나 비밀번호가 틀리면 에러 리턴
        if (user.isEmpty() || !user.get().getPswd().equals(loginDto.getPswd())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "아이디 또는 비밀번호가 잘못되었습니다."));
        }

        // 3. 로그인 성공 시 사용자 정보(이름 등) 리턴
        return ResponseEntity.ok(Map.of(
                "message", "로그인 성공",
                "userId", user.get().getUserId(),
                "userNm", user.get().getUserNm()
        ));
    }
}
