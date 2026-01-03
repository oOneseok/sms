package com.example.sms.repository;

import com.example.sms.entity.OrderMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderMstRepository extends JpaRepository<OrderMst, String> {

    // 최신 주문부터 목록 정렬
    List<OrderMst> findAllByOrderByOrderDtDesc();

    List<OrderMst> findAllByOrderByOrderDtAsc();
}
