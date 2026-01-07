package com.example.sms.controller;

import com.example.sms.dto.OrderDetDto;
import com.example.sms.dto.OrderDto;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.entity.OrderMst;
import com.example.sms.service.OrderService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // ✅ 1) 주문 목록 조회 (details 포함)
    @GetMapping
    public ResponseEntity<List<OrderMst>> list(
            @RequestParam(defaultValue = "DESC") String sort
    ) {
        List<OrderMst> orderList = orderService.getOrderList(sort);
        // 각 OrderMst에 상세 정보(details)를 채워 넣음
        orderList.forEach(order ->
                order.setDetails(orderService.getOrderDetails(order.getOrderCd()))
        );
        return ResponseEntity.ok(orderList);
    }

    // ✅ 2) 주문 단건 조회 (custNm 포함)
    @GetMapping("/{orderCd}")
    public ResponseEntity<OrderDto> one(@PathVariable String orderCd) {
        return ResponseEntity.ok(orderService.getOrderDto(orderCd));
    }

    // ✅ 3) 주문 상세 조회 (itemNm 포함)
    @GetMapping("/{orderCd}/details")
    public ResponseEntity<List<OrderDetDto>> details(@PathVariable String orderCd) {
        return ResponseEntity.ok(orderService.getOrderDetailsDto(orderCd));
    }

    // ✅ 저장 (기존 그대로 유지)
    @PostMapping
    public ResponseEntity<Map<String, Object>> save(@RequestBody OrderForm form) {
        String orderCd = orderService.saveOrder(
                form.getOrderCd(),
                form.getOrderDt(),
                form.getCustCd(),
                form.getCustEmp(),
                form.getRemark(),
                form.getDetails()
        );
        return ResponseEntity.ok(Map.of("orderCd", orderCd));
    }

    @DeleteMapping("/{orderCd}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String orderCd) {
        orderService.deleteOrder(orderCd);
        return ResponseEntity.ok(Map.of("message", "삭제 완료"));
    }

    @Data
    public static class OrderForm {
        private String orderCd;
        private LocalDate orderDt;
        private String custCd;
        private String custEmp;
        private String remark;
        private List<OrderDetMst> details; // 저장은 엔티티 구조 그대로 받기
    }
}
