package com.example.sms.controller;

import com.example.sms.dto.ItemInOutDto;
import com.example.sms.dto.StockHistoryDto;
import com.example.sms.entity.PurchaseDetMst;
import com.example.sms.repository.ItemIoRepository;
import com.example.sms.service.ItemInOutService;
import com.example.sms.service.PurchaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inout")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ItemInOutController {

    private final ItemIoRepository itemIoRepository;
    private final ItemInOutService itemInOutService;
    private final PurchaseService purchaseService;

    // 1. 전체 입출고 내역 조회
    @GetMapping
    public ResponseEntity<List<ItemInOutDto>> getList() {
        return ResponseEntity.ok(itemInOutService.getInOutList());
    }

    // 2. 입고 대기 목록(발주 확정 건) 조회
    @GetMapping("/waiting-purchase")
    public ResponseEntity<List<PurchaseDetMst>> getWaitingPurchases() {
        return ResponseEntity.ok(purchaseService.getWaitingForInboundList());
    }

    // 3. 발주 건 -> 입고 처리 (확정)
    @PostMapping("/in/from-purchase")
    public ResponseEntity<String> registerInboundFromPurchase(@RequestBody Map<String, Object> req) {
        try {
            String purchaseCd = (String) req.get("purchaseCd");
            Integer seqNo = (Integer) req.get("seqNo");
            String toWhCd = (String) req.get("toWhCd");
            String itemCd = (String) req.get("itemCd");
            Integer qty = (Integer) req.get("qty");
            String remark = (String) req.get("remark");

            itemInOutService.registerInboundFromPurchase(purchaseCd, seqNo, toWhCd, itemCd, qty, remark);
            return ResponseEntity.ok("입고 처리가 완료되었습니다.");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("오류 발생: " + e.getMessage());
        }
    }

    @GetMapping("/by-ref")
    public ResponseEntity<?> getItemIoByRef(
            @RequestParam String refTb,
            @RequestParam String refCd,
            @RequestParam Integer refSeq
    ) {
        // Service에 로직 위임 (간단해서 바로 Repository 호출 예시)
        // 실제로는 Service에 메소드 만드는 것이 정석입니다.
        return itemIoRepository.findByRefTbAndRefCdAndRefSeq(refTb, refCd, refSeq)
                .map(io -> {
                    // 필요한 정보만 리턴
                    Map<String, Object> info = new HashMap<>();
                    info.put("ioDt", io.getIoDt());
                    info.put("toWhCd", io.getToWh() != null ? io.getToWh().getWhNm() + "(" + io.getToWh().getWhCd() + ")" : "-");
                    info.put("qty", io.getQty());
                    info.put("remark", io.getRemark());
                    return ResponseEntity.ok(info);
                })
                .orElse(ResponseEntity.noContent().build()); // 없으면 204 No Content
    }

    @GetMapping("/history")
    public ResponseEntity<List<StockHistoryDto>> getHistory(
            @RequestParam String type, // ITEM or WH
            @RequestParam String code
    ) {
        return ResponseEntity.ok(itemInOutService.getStockHistory(type, code));
    }
}