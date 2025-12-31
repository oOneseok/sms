package com.example.sms.controller;

import com.example.sms.dto.ProdReceiveReq;
import com.example.sms.dto.ProdReserveReq;
import com.example.sms.dto.ProdResultSaveReq;
import com.example.sms.entity.ItemIo;
import com.example.sms.entity.Prod;
import com.example.sms.entity.ProdResult;
import com.example.sms.repository.ItemIoRepository;
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
    private final ItemIoRepository itemIoRepository; // ✅ Repository 추가됨
    private final ProdService prodService;

    // 목록 + 필터 + 페이징
    @GetMapping
    public Page<Prod> list(@RequestParam(required = false) String itemCd,
                           @RequestParam(required = false) String status,
                           Pageable pageable) {
        return prodRepository.search(itemCd, status, pageable);
    }

    // 단건 조회
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

    // 취소
    @PutMapping("/{prodNo}/cancel")
    @Transactional
    public Prod cancel(@PathVariable String prodNo, @RequestParam(required = false) String remark) {
        return prodService.cancelProd(prodNo, remark);
    }

    // 생산실적 목록
    @GetMapping("/{prodNo}/results")
    public List<ProdResult> results(@PathVariable String prodNo) {
        return prodResultRepository.findByProdNoOrderBySeq(prodNo);
    }

    // ===========================
    // ✅ 예약 (수동 할당 적용됨)
    // ===========================
    @PostMapping("/{prodNo}/reserve")
    @Transactional
    public ProdService.ReserveResult reserve(@PathVariable String prodNo,
                                             @RequestBody(required = false) ProdReserveReq req) {
        // req가 없으면 null로 전달 -> 서비스에서 자동 배분 처리
        return prodService.reserveMaterials(prodNo, req);
    }

    @GetMapping("/logs/all")
    public List<ItemIo> getAllProdLogs() {
        // TB_PROD와 관련된 모든 ItemIo 기록을 최신순으로 가져옴
        return itemIoRepository.findByRefTbOrderByIoDtDesc("TB_PROD");
    }

    // 예약해제
    @PostMapping("/{prodNo}/unreserve")
    @Transactional
    public void unreserve(@PathVariable String prodNo,
                          @RequestParam(required = false) String remark) {
        prodService.unreserveMaterials(prodNo, remark);
    }

    // 소모 (투입)
    @PostMapping("/{prodNo}/consume")
    @Transactional
    public void consume(@PathVariable String prodNo,
                        @RequestParam(required = false) String remark) {
        prodService.consumeReservedMaterials(prodNo, remark);
    }

    // ===========================
    // ✅ 생산완료 (정상품/불량 저장)
    // ===========================
    @PostMapping("/{prodNo}/results2")
    @Transactional
    public ProdResult saveResult(@PathVariable String prodNo,
                                 @RequestBody ProdResultSaveReq req) {
        return prodService.saveProdResult(
                prodNo,
                req.getResultDt(),
                req.getWhCd(),
                req.getGoodQty(),
                req.getBadQty(),
                req.getBadRes(),
                req.getRemark()
        );
    }


    // ===========================
    // ✅ 완제품 입고
    // ===========================
    @PostMapping("/{prodNo}/receive")
    @Transactional
    public void receive(@PathVariable String prodNo, @RequestBody ProdReceiveReq req) {
        prodService.receiveFinishedGoods(prodNo, req);
    }

    // ===========================
    // ✅ [신규] 공정 로그(이력) 조회
    // ===========================
    @GetMapping("/{prodNo}/logs")
    public List<ItemIo> getProdLogs(@PathVariable String prodNo) {
        // 1단계에서 추가한 Repository 메소드 호출
        return itemIoRepository.findByRefTbAndRefCdOrderByIoDtAsc("TB_PROD", prodNo);
    }

    @Data
    public static class ReceiveReq {
        private String whCd;
        private BigDecimal qty;
        private String remark;
    }
}