package com.example.sms.controller;

import com.example.sms.entity.CompMst;
import com.example.sms.repository.CompRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comp")
@RequiredArgsConstructor
public class CompController {

    private final CompRepository compRepository;
    private final LogService logService;
    private static final String MENU_NAME = "사업장 관리";

    // 1. 목록 조회
    @GetMapping
    public List<CompMst> getCompList(@RequestParam(required = false, defaultValue = "") String searchText) {
        if (searchText.isEmpty()) {
            return compRepository.findAll();
        } else {
            return compRepository.findByCompNmContainingOrBizNoContaining(searchText, searchText);
        }
    }

    // 2. 저장
    @PostMapping
    public CompMst saveComp(@RequestBody CompMst compMst) {
        // A. 신규인지 수정인지 판단 로직 (DB에 해당 ID가 없으면 등록, 있으면 수정으로 간주)
        boolean isExists = false;
        if (compMst.getCompCd() != null && !compMst.getCompCd().isEmpty()) {
            isExists = compRepository.existsById(compMst.getCompCd());
        }

        String actionType = isExists ? "수정" : "등록";
        // B. DB 저장
        CompMst savedComp = compRepository.save(compMst);

        // C. 로그 저장 param: 메뉴명, 행위, ID, 이름(업체명)
        logService.saveLog(MENU_NAME, actionType, savedComp.getCompCd(), savedComp.getCompNm());

        return savedComp;
    }

    // 3. 삭제
    @DeleteMapping("/{compCd}")
    public void deleteComp(@PathVariable String compCd) {
        // A. 삭제 전에 이름을 알아내야 로그에 남길 수 있음! (DB에서 조회 먼저 수행)
        CompMst target = compRepository.findById(compCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 거래처입니다."));
        String targetName = target.getCompNm(); // 삭제될 업체의 이름 확보

        // B. 삭제 수행
        compRepository.delete(target);
        // C. 로그 저장 (삭제된 업체의 이름을 같이 넘겨줌)
        logService.saveLog(MENU_NAME, "삭제", compCd, targetName);
    }
}