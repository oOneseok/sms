package com.example.sms.controller;

import com.example.sms.entity.ProcMst;
import com.example.sms.repository.ProcRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proc")
@RequiredArgsConstructor
public class ProcController {

    private final ProcRepository procRepository;
    private final LogService logService;
    private static final String MENU_NAME = "공정 관리";

    // 1. 조회 (검색)
    @GetMapping
    public List<ProcMst> getProcList(@RequestParam(required = false, defaultValue = "") String searchText) {
        if (searchText.isEmpty()) {
            return procRepository.findAll();
        } else {
            return procRepository.findByProcCdContainingOrProcNmContaining(searchText, searchText);
        }
    }

    // 2. 저장 (신규/수정)
    @PostMapping
    public ProcMst saveProc(@RequestBody ProcMst procMst) {
        // 신규 여부 확인 (로그용)
        boolean isExists = procRepository.existsById(procMst.getProcCd());
        String actionType = isExists ? "수정" : "등록";

        // 저장
        ProcMst saved = procRepository.save(procMst);

        // 로그 기록
        logService.saveLog(MENU_NAME, actionType, saved.getProcCd(), saved.getProcNm());

        return saved;
    }

    // 3. 삭제
    @DeleteMapping("/{procCd}")
    public void deleteProc(@PathVariable String procCd) {
        // 삭제 전 이름 조회 (로그용)
        ProcMst target = procRepository.findById(procCd)
                .orElseThrow(() -> new IllegalArgumentException("대상 공정이 없습니다."));

        String targetName = target.getProcNm();

        // 삭제
        procRepository.delete(target);

        // 로그 기록
        logService.saveLog(MENU_NAME, "삭제", procCd, targetName);
    }
}