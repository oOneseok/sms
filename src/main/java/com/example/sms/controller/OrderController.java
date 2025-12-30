package com.example.sms.controller;

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

    @GetMapping
    public ResponseEntity<List<OrderMst>> list() {
        return ResponseEntity.ok(orderService.getOrderList());
    }

    @GetMapping("/{orderCd}")
    public ResponseEntity<OrderMst> one(@PathVariable String orderCd) {
        return ResponseEntity.ok(orderService.getOrder(orderCd));
    }

    @GetMapping("/{orderCd}/details")
    public ResponseEntity<List<OrderDetMst>> details(@PathVariable String orderCd) {
        return ResponseEntity.ok(orderService.getOrderDetails(orderCd));
    }

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
        private List<OrderDetMst> details;
    }
}