package com.example.sms.repository;

import com.example.sms.entity.PurchaseDetIdMst;
import com.example.sms.entity.PurchaseDetMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseDetMstRepository extends JpaRepository<PurchaseDetMst, PurchaseDetIdMst> {

    // 특정 발주번호의 상세 목록
    List<PurchaseDetMst> findByIdPurchaseCdOrderByIdSeqNoAsc(String purchaseCd);

    // 발주번호로 상세 전체 삭제(수정 시 갈아끼우기 용)
    void deleteByIdPurchaseCd(String purchaseCd);
}
