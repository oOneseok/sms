package com.example.sms.controller;

import com.example.sms.entity.Prod;
import com.example.sms.entity.ProdResult;
import com.example.sms.repository.ProdRepository;
import com.example.sms.repository.ProdResultRepository;
import com.example.sms.service.ProdService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    // 생산실적 등록 + (선택) 입고/IO/HIS/재고 반영까지
    // POST /api/prods/{prodNo}/results
    @PostMapping("/{prodNo}/results")
    @Transactional
    public ProdResult createResult(@PathVariable String prodNo, @RequestBody ProdResultReq req) {
        return prodService.createResultAndOptionallyReceive(
                prodNo,
                req.resultDt,
                req.whCd,
                req.goodQty,
                req.badQty,
                req.badRes,
                req.remark,
                Boolean.TRUE.equals(req.applyToStockAndIo)
        );
    }

    @Data
    public static class ProdResultReq {
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate resultDt;
        private String whCd;
        private BigDecimal goodQty;
        private BigDecimal badQty;
        private String badRes;
        private String remark;

        // ✅ true면: TB_ITEMSTOCK 반영 + TB_ITEMSTOCK_HIS 기록 + TB_ITEM_IO 기록 + PROD status=05
        private Boolean applyToStockAndIo;
    }
}
