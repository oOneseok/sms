package com.example.sms.controller;

import com.example.sms.entity.LogMst;
import com.example.sms.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/logs") // 프론트엔드에서 호출하는 주소
@RequiredArgsConstructor
public class LogController {

    private final LogRepository logRepository;

    // 로그 전체 조회 (최신순)
    @GetMapping
    public List<LogMst> getLogs() {
        return logRepository.findAllByOrderByLogNoDesc();
    }
}