package com.example.sms.controller;

import com.example.sms.entity.CustMst;
import com.example.sms.repository.CustRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cust")
@RequiredArgsConstructor
public class CustController {

    private final CustRepository custRepository;
    private final LogService logService;

    // 로그에 남길 메뉴명 상수 정의
    private static final String MENU_NAME = "거래처 관리";

    // ✅ 구분값: 01=구매처, 02=고객사
    private static final String FLAG_VENDOR = "01";
    private static final String FLAG_CUSTOMER = "02";

    // bizFlag 유효성 검증 메소드
    private void validateBizFlag(String bizFlag) {
        if (!FLAG_VENDOR.equals(bizFlag) && !FLAG_CUSTOMER.equals(bizFlag)) {
            throw new IllegalArgumentException("구분값(bizFlag)은 01(구매처) 또는 02(고객사)만 가능합니다.");
        }
    }

    /**
     * 1. 목록 조회
     * - bizFlag(탭 구분)에 따라 데이터를 조회합니다.
     * - 검색어(searchText)가 있으면 이름이나 사업자번호로 검색합니다.
     */
    @GetMapping
    public ResponseEntity<List<CustMst>> getList(
            @RequestParam(defaultValue = FLAG_CUSTOMER) String bizFlag, // 기본값: 고객사(02)
            @RequestParam(defaultValue = "") String searchText
    ) {
        validateBizFlag(bizFlag);

        if (searchText.isBlank()) {
            return ResponseEntity.ok(custRepository.findByBizFlag(bizFlag));
        }

        // 검색어가 있을 경우 (이름 OR 사업자번호 LIKE 검색)
        return ResponseEntity.ok(
                custRepository.findByBizFlagAndCustNmContainingOrBizFlagAndBizNoContaining(
                        bizFlag, searchText.trim(),
                        bizFlag, searchText.trim()
                )
        );
    }

    //2. 저장 (신규 등록 및 수정)
    @PostMapping
    public ResponseEntity<CustMst> save(@RequestBody CustMst cust) {
        // 필수값 검증
        if (cust.getCustCd() == null || cust.getCustCd().isBlank()) {
            throw new IllegalArgumentException("거래처코드(CUST_CD)는 필수입니다.");
        }
        if (cust.getCustNm() == null || cust.getCustNm().isBlank()) {
            throw new IllegalArgumentException("거래처명(CUST_NM)은 필수입니다.");
        }

        // 구분값(bizFlag) 검증 및 기본값 처리
        if (cust.getBizFlag() == null || cust.getBizFlag().isBlank()) {
            cust.setBizFlag(FLAG_CUSTOMER);
        }
        validateBizFlag(cust.getBizFlag());

        // A. 신규/수정 여부 판단 (DB 조회)
        boolean exists = custRepository.existsById(cust.getCustCd());
        String actionType = exists ? "수정" : "등록";

        // B. DB 저장
        CustMst saved = custRepository.save(cust);

        // C. 로그 저장
        // 파라미터: 메뉴명, 행위, 식별키(ID), 식별이름(거래처명)
        logService.saveLog(MENU_NAME, actionType, saved.getCustCd(), saved.getCustNm());

        return ResponseEntity.ok(saved);
    }
    //삭제
    @DeleteMapping("/{custCd}")
    public ResponseEntity<Void> delete(@PathVariable String custCd) {
        // A. 삭제 전 대상 조회 (로그에 이름을 남기기 위함)
        CustMst target = custRepository.findById(custCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 거래처입니다."));

        // B. 삭제 수행
        custRepository.delete(target);

        // C. 로그 저장
        logService.saveLog(MENU_NAME, "삭제", target.getCustCd(), target.getCustNm());

        return ResponseEntity.ok().build();
    }
}