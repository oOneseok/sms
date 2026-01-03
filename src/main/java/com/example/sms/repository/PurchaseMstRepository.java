package com.example.sms.repository;

import com.example.sms.entity.PurchaseMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseMstRepository extends JpaRepository<PurchaseMst, String> {

    // 최신 발주부터 목록 정렬
    List<PurchaseMst> findAllByOrderByPurchaseDtDesc();

    List<PurchaseMst> findAllByOrderByPurchaseDtAsc();
}
