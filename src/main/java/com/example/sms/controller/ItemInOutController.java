package com.example.sms.controller;

import com.example.sms.dto.ItemInOutDto;
import com.example.sms.dto.StockHistoryDto;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.entity.PurchaseDetMst;
import com.example.sms.service.ItemInOutService;
import com.example.sms.service.OrderService;
import com.example.sms.service.PurchaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inout")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ItemInOutController {

    private final ItemInOutService itemInOutService;
    private final PurchaseService purchaseService;
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<ItemInOutDto>> getList() {
        return ResponseEntity.ok(itemInOutService.getInOutList());
    }

    // 1. 입고 대기 목록 (발주 확정 건) 조회
    @GetMapping("/waiting-purchase")
    public ResponseEntity<List<PurchaseDetMst>> getWaitingPurchases() {
        return ResponseEntity.ok(purchaseService.getWaitingForInboundList());
    }

    // 2. 발주 건 -> 입고 처리 (확정)
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

    // 3. 출고 대기 목록 (주문 확정 건) 조회
    @GetMapping("/waiting-order")
    public ResponseEntity<List<OrderDetMst>> getWaitingOrders() {
        return ResponseEntity.ok(orderService.getWaitingForOutboundList());
    }

    // 4. ✅ [수정] 주문 건 -> 출고 처리 (확정)
    @PostMapping("/out/from-order")
    public ResponseEntity<String> registerOutboundFromOrder(@RequestBody Map<String, Object> req) {
        try {
            String orderCd = (String) req.get("orderCd");
            Integer seqNo = (Integer) req.get("seqNo"); // ✅ 추가됨
            String itemCd = (String) req.get("itemCd");
            String fromWhCd = (String) req.get("fromWhCd");
            Integer qty = (Integer) req.get("qty");
            String remark = (String) req.get("remark");

            itemInOutService.registerOutboundFromOrder(orderCd, seqNo, itemCd, fromWhCd, qty, remark);
            return ResponseEntity.ok("출고 처리가 완료되었습니다.");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("오류 발생: " + e.getMessage());
        }
    }

    // 5. 재고 이력 조회 (재고관리 화면 우측)
    @GetMapping("/history")
    public ResponseEntity<List<StockHistoryDto>> getHistory(
            @RequestParam String type, // ITEM or WH
            @RequestParam String code
    ) {
        return ResponseEntity.ok(itemInOutService.getStockHistory(type, code));
    }

    // 6. ✅ [추가] 현재고 조회 (화면 표시용)
    @GetMapping("/stock/check")
    public ResponseEntity<BigDecimal> checkStock(
            @RequestParam String whCd,
            @RequestParam String itemCd
    ) {
        return ResponseEntity.ok(itemInOutService.getCurrentStock(whCd, itemCd));
    }

}