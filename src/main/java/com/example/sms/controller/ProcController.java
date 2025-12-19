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

        // A. 신규인지 수정인지 판단 로직 (DB에 해당 ID가 없으면 등록, 있으면 수정으로 간주)
        boolean isExists = procRepository.existsById(procMst.getProcCd());
        String actionType = isExists ? "수정" : "등록";

        // B. DB 저장
        ProcMst saved = procRepository.save(procMst);

        // C. 로그 저장
        logService.saveLog(MENU_NAME, actionType, saved.getProcCd(), saved.getProcNm());

        return saved;
    }

    // 3. 삭제
    @DeleteMapping("/{procCd}")
    public void deleteProc(@PathVariable String procCd) {

        // A. 삭제 전에 이름을 알아내야 로그에 남길 수 있음! (DB에서 조회 먼저 수행)
        ProcMst target = procRepository.findById(procCd)
                .orElseThrow(() -> new IllegalArgumentException("대상 공정이 없습니다."));

        String targetName = target.getProcNm();

        // B. 삭제 수행
        procRepository.delete(target);

        // C. 로그 저장 (삭제된 공정의 이름을 같이 넘겨줌)
        logService.saveLog(MENU_NAME, "삭제", procCd, targetName);
    }
}