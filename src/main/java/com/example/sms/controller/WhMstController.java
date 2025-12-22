package com.example.sms.controller;

import com.example.sms.entity.WhMst;
import com.example.sms.repository.WhMstRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/whs")
@RequiredArgsConstructor
public class WhMstController {

    private final WhMstRepository whMstRepository;
    private final LogService logService;

    private static final String MENU_NAME = "창고 관리";

    // 1. 목록 조회 (검색 기능 포함)
    @GetMapping
    public ResponseEntity<List<WhMst>> getList(
            @RequestParam(required = false, defaultValue = "") String keyword
    ) {
        // 검색어가 없으면 전체, 있으면 검색 (Repository 메소드 사용)
        if (keyword.isBlank()) {
            return ResponseEntity.ok(whMstRepository.findAll());
        } else {
            return ResponseEntity.ok(whMstRepository.findByWhNmContainingOrWhCdContaining(keyword, keyword));
        }
    }

    // 2. 저장 (신규/수정)
    @PostMapping
    public ResponseEntity<WhMst> save(@RequestBody WhMst whMst) {
        if (whMst.getWhCd() == null || whMst.getWhCd().isBlank()) {
            throw new IllegalArgumentException("창고코드는 필수입니다.");
        }

        // 신규 여부 확인
        boolean exists = whMstRepository.existsById(whMst.getWhCd());
        String actionType = exists ? "수정" : "등록";

        // 저장
        WhMst saved = whMstRepository.save(whMst);

        // 로그 기록
        logService.saveLog(MENU_NAME, actionType, saved.getWhCd(), saved.getWhNm());

        return ResponseEntity.ok(saved);
    }

    // 3. 삭제
    @DeleteMapping("/{whCd}")
    public ResponseEntity<Void> delete(@PathVariable String whCd) {
        WhMst target = whMstRepository.findById(whCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 창고입니다."));

        whMstRepository.delete(target);

        // 로그 기록
        logService.saveLog(MENU_NAME, "삭제", target.getWhCd(), target.getWhNm());

        return ResponseEntity.ok().build();
    }
}