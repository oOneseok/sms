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

    private static final String MENU_NAME = "거래처 관리";

    // ✅ 01=구매처, 02=고객사
    private static final String FLAG_VENDOR = "01";
    private static final String FLAG_CUSTOMER = "02";

    private void validateBizFlag(String bizFlag) {
        if (!FLAG_VENDOR.equals(bizFlag) && !FLAG_CUSTOMER.equals(bizFlag)) {
            throw new IllegalArgumentException("bizFlag는 01(구매처) 또는 02(고객사)만 가능합니다.");
        }
    }

    // 목록 조회: bizFlag + 검색(거래처명/사업자번호)
    @GetMapping
    public ResponseEntity<List<CustMst>> getList(
            @RequestParam(defaultValue = FLAG_CUSTOMER) String bizFlag, // 기본: 고객사(02)
            @RequestParam(defaultValue = "") String searchText
    ) {
        validateBizFlag(bizFlag);

        if (searchText.isBlank()) {
            return ResponseEntity.ok(custRepository.findByBizFlag(bizFlag));
        }

        return ResponseEntity.ok(
                custRepository.findByBizFlagAndCustNmContainingOrBizFlagAndBizNoContaining(
                        bizFlag, searchText.trim(),
                        bizFlag, searchText.trim()
                )
        );
    }

    // 저장(등록/수정)
    @PostMapping
    public ResponseEntity<CustMst> save(@RequestBody CustMst cust) {
        if (cust.getCustCd() == null || cust.getCustCd().isBlank()) {
            throw new IllegalArgumentException("거래처코드(CUST_CD)는 필수입니다.");
        }
        if (cust.getCustNm() == null || cust.getCustNm().isBlank()) {
            throw new IllegalArgumentException("거래처명(CUST_NM)은 필수입니다.");
        }

        // ✅ 프론트에서 01/02 선택해서 보내는 값이므로 서버에서도 검증
        if (cust.getBizFlag() == null || cust.getBizFlag().isBlank()) {
            // 혹시 프론트가 bizFlag를 안 보내면(실수 방지) 기본 고객사로 처리
            cust.setBizFlag(FLAG_CUSTOMER);
        }
        validateBizFlag(cust.getBizFlag());

        boolean exists = custRepository.existsById(cust.getCustCd());
        String actionType = exists ? "수정" : "등록";

        CustMst saved = custRepository.save(cust);

        // 로그: 메뉴명, 행위, 키, 이름
        logService.saveLog(MENU_NAME, actionType, saved.getCustCd(), saved.getCustNm());

        return ResponseEntity.ok(saved);
    }

    // 삭제
    @DeleteMapping("/{custCd}")
    public ResponseEntity<Void> delete(@PathVariable String custCd) {
        CustMst target = custRepository.findById(custCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 거래처입니다."));

        custRepository.delete(target);
        logService.saveLog(MENU_NAME, "삭제", target.getCustCd(), target.getCustNm());

        return ResponseEntity.ok().build();
    }
}
