package com.example.sms.controller;

import com.example.sms.dto.PurchaseDetDto;
import com.example.sms.entity.PurchaseDetMst;
import com.example.sms.entity.PurchaseMst;
import com.example.sms.service.PurchaseService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    // 1. 발주 목록 조회
    @GetMapping
    public ResponseEntity<List<PurchaseMst>> getList(
            @RequestParam(defaultValue = "DESC") String sort
    ) {
        return ResponseEntity.ok(purchaseService.getPurchaseList(sort));
    }
    // 2. 발주 단건 조회 (헤더 정보)
    @GetMapping("/{purchaseCd}")
    public ResponseEntity<PurchaseMst> getOne(@PathVariable String purchaseCd) {
        return ResponseEntity.ok(purchaseService.getPurchase(purchaseCd));
    }

    // 3. 발주 상세 조회 (디테일 목록)
    @GetMapping("/{purchaseCd}/details")
    public List<PurchaseDetDto> getPurchaseDetails(@PathVariable String purchaseCd) {
        return purchaseService.getPurchaseDetailsDto(purchaseCd);
    }

    // 4. 저장 (신규/수정 공통)
    @PostMapping
    public ResponseEntity<?> save(@RequestBody PurchaseForm form) {
        // 프론트에서 받은 JSON 데이터를 서비스로 전달
        String savedCd = purchaseService.savePurchase(
                form.getPurchaseCd(),
                form.getPurchaseDt(),
                form.getCustCd(),
                form.getCustEmp(),
                form.getRemark(),
                form.getDetails()
        );

        // 저장된 발주번호 리턴 (프론트에서 재조회용)
        return ResponseEntity.ok(Map.of("purchaseCd", savedCd));
    }

    // 5. 삭제
    @DeleteMapping("/{purchaseCd}")
    public ResponseEntity<Void> delete(@PathVariable String purchaseCd) {
        purchaseService.deletePurchase(purchaseCd);
        return ResponseEntity.ok().build();
    }

    // ✅ 프론트엔드 JSON 데이터를 받을 DTO (내부 클래스)
    @Data
    public static class PurchaseForm {
        private String purchaseCd;
        private LocalDate purchaseDt;
        private String custCd;
        private String custEmp;
        private String remark;

        // 상세 리스트 (PurchaseDetMst 엔티티 구조 그대로 매핑)
        private List<PurchaseDetMst> details;
    }
}