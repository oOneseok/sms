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

    @GetMapping
    public Page<Prod> list(@RequestParam(required = false) String itemCd,
                           @RequestParam(required = false) String status,
                           Pageable pageable) {
        return prodRepository.search(itemCd, status, pageable);
    }

    @GetMapping("/{prodNo}")
    public Prod detail(@PathVariable String prodNo) {
        return prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));
    }

    @PostMapping
    @Transactional
    public Prod create(@RequestBody Prod body) {
        return prodService.createProd(body);
    }

    @PutMapping("/{prodNo}")
    @Transactional
    public Prod update(@PathVariable String prodNo, @RequestBody Prod body) {
        return prodService.updateProd(prodNo, body);
    }

    @PutMapping("/{prodNo}/cancel")
    @Transactional
    public Prod cancel(@PathVariable String prodNo,
                       @RequestParam(required = false) String remark) {
        return prodService.cancelProd(prodNo, remark);
    }

    @GetMapping("/{prodNo}/results")
    public List<ProdResult> results(@PathVariable String prodNo) {
        return prodResultRepository.findByProdNoOrderBySeq(prodNo);
    }

    // ===========================
    // ✅ 예약/예약취소/소모
    // ===========================
    @PostMapping("/{prodNo}/reserve")
    @Transactional
    public ProdService.ReserveResult reserve(@PathVariable String prodNo,
                                             @RequestParam(required = false) String remark) {
        return prodService.reserveMaterials(prodNo, remark);
    }

    @PostMapping("/{prodNo}/unreserve")
    @Transactional
    public void unreserve(@PathVariable String prodNo,
                          @RequestParam(required = false) String remark) {
        prodService.unreserveMaterials(prodNo, remark);
    }

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
    public ProdResult saveResult(@PathVariable String prodNo, @RequestBody ProdResultSaveReq req) {
        return prodService.saveProdResult(
                prodNo,
                req.getResultDt(),
                req.getWhCd(),       // ✅ 반드시 들어와야 함
                req.getGoodQty(),
                req.getBadQty(),
                req.getBadRes(),
                req.getRemark()
        );
    }

    @Data
    public static class ProdResultSaveReq {
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate resultDt;
        private String whCd;        // ✅ 추가 (NOT NULL 컬럼)
        private BigDecimal goodQty;
        private BigDecimal badQty;
        private String badRes;
        private String remark;
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
