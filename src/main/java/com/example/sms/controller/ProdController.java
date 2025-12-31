package com.example.sms.controller;

import com.example.sms.dto.ProdResultSaveReq;
import com.example.sms.entity.Prod;
import com.example.sms.entity.ProdResult;
import com.example.sms.repository.ProdRepository;
import com.example.sms.repository.ProdResultRepository;
import com.example.sms.service.ProdService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/prods")
public class ProdController {

    private final ProdRepository prodRepository;
    private final ProdResultRepository prodResultRepository;
    private final ProdService prodService;

    // 목록 + 필터 + 페이징
    // GET /api/prods?itemCd=ITEM001&status=01&page=0&size=20
    @GetMapping
    public Page<Prod> list(@RequestParam(required = false) String itemCd,
                           @RequestParam(required = false) String status,
                           Pageable pageable) {
        return prodRepository.search(itemCd, status, pageable);
    }

    // 단건
    @GetMapping("/{prodNo}")
    public Prod detail(@PathVariable String prodNo) {
        return prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));
    }

    // 생성
    @PostMapping
    @Transactional
    public Prod create(@RequestBody Prod body) {
        return prodService.createProd(body);
    }

    // 수정
    @PutMapping("/{prodNo}")
    @Transactional
    public Prod update(@PathVariable String prodNo, @RequestBody Prod body) {
        return prodService.updateProd(prodNo, body);
    }

    // 취소(언제든)
    @PutMapping("/{prodNo}/cancel")
    @Transactional
    public Prod cancel(@PathVariable String prodNo,
                       @RequestParam(required = false) String remark) {
        return prodService.cancelProd(prodNo, remark);
    }

    // 생산실적 목록
    @GetMapping("/{prodNo}/results")
    public List<ProdResult> results(@PathVariable String prodNo) {
        return prodResultRepository.findByProdNoOrderBySeq(prodNo);
    }

    // ===========================
    // ✅ 예약/예약취소/소모
    // ===========================

    // 02 -> 03 (자재 예약)
    @PostMapping("/{prodNo}/reserve")
    @Transactional
    public ProdService.ReserveResult reserve(@PathVariable String prodNo,
                                             @RequestParam(required = false) String remark) {
        return prodService.reserveMaterials(prodNo, remark);
    }

    // 03 -> (예약해제)
    @PostMapping("/{prodNo}/unreserve")
    @Transactional
    public void unreserve(@PathVariable String prodNo,
                          @RequestParam(required = false) String remark) {
        prodService.unreserveMaterials(prodNo, remark);
        // 상태를 02로 내리는 건 프론트에서 PUT /api/prods/{prodNo} 로 status=02 업데이트 권장
    }

    // 03 -> 04 (예약 소모 = 생산 투입)
    @PostMapping("/{prodNo}/consume")
    @Transactional
    public void consume(@PathVariable String prodNo,
                        @RequestParam(required = false) String remark) {
        prodService.consumeReservedMaterials(prodNo, remark);
    }

    // ===========================
    // ✅ 생산완료(정상품/불량 저장)
    // ===========================
    @PostMapping("/{prodNo}/results2")
    @Transactional
    public ProdResult saveResult(@PathVariable String prodNo,
                                 @RequestBody ProdResultSaveReq req) {

        return prodService.saveProdResult(
                prodNo,
                req.getResultDt(),
                req.getWhCd(),      // ✅ dto 패키지의 ProdResultSaveReq에 존재
                req.getGoodQty(),
                req.getBadQty(),
                req.getBadRes(),
                req.getRemark()
        );
    }

    // ===========================
    // ✅ 완제품 입고(창고배정)
    // ===========================
    @PostMapping("/{prodNo}/receive")
    @Transactional
    public void receive(@PathVariable String prodNo, @RequestBody ReceiveReq req) {
        prodService.receiveFinishedGoods(prodNo, req.whCd, req.qty, req.remark);
    }

    @Data
    public static class ReceiveReq {
        private String whCd;
        private BigDecimal qty;
        private String remark;
    }
}
