package com.example.sms.controller;

import com.example.sms.dto.OrderDetDto;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.service.OrderDetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/wh/order-det")
public class OrderDetController {

    private final OrderDetService service;

    // ✅ 전체/검색
    @GetMapping
    public ResponseEntity<List<OrderDetMst>> list(
            @RequestParam(required = false) String orderCd,
            @RequestParam(required = false) String itemCd,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(service.search(orderCd, itemCd, status));
    }

    // ✅ 단건
    @GetMapping("/{orderCd}/{seqNo}")
    public ResponseEntity<OrderDetMst> one(@PathVariable String orderCd, @PathVariable Integer seqNo) {
        return ResponseEntity.ok(service.one(orderCd, seqNo));
    }

    // ✅ 저장(신규/수정 업서트)
    @PostMapping
    public ResponseEntity<OrderDetMst> save(@RequestBody OrderDetDto dto) {
        return ResponseEntity.ok(service.save(dto));
    }

    // ✅ 수정
    @PutMapping("/{orderCd}/{seqNo}")
    public ResponseEntity<OrderDetMst> update(
            @PathVariable String orderCd,
            @PathVariable Integer seqNo,
            @RequestBody OrderDetDto dto
    ) {
        dto.setOrderCd(orderCd);
        dto.setSeqNo(seqNo);
        return ResponseEntity.ok(service.save(dto));
    }

    // ✅ 삭제
    @DeleteMapping("/{orderCd}/{seqNo}")
    public ResponseEntity<Void> delete(@PathVariable String orderCd, @PathVariable Integer seqNo) {
        service.delete(orderCd, seqNo);
        return ResponseEntity.noContent().build();
    }
}
