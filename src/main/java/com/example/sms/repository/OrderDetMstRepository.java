package com.example.sms.repository;

import com.example.sms.entity.OrderDetIdMst;
import com.example.sms.entity.OrderDetMst;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderDetMstRepository extends JpaRepository<OrderDetMst, OrderDetIdMst> {

    // ✅ [변경] 순번(SeqNo) 순서로 조회
    List<OrderDetMst> findByIdOrderCdOrderByIdSeqNoAsc(String orderCd);

    // ✅ [추가] 출고 처리 시 '주문번호 + 품목'으로 상세를 찾기 위해 필요 (PK가 바뀌었으므로)
    @Query("SELECT d FROM OrderDetMst d WHERE d.id.orderCd = :orderCd AND d.itemCd = :itemCd")
    Optional<OrderDetMst> findByOrderCdAndItemCd(@Param("orderCd") String orderCd, @Param("itemCd") String itemCd);

    // 삭제용
    void deleteByIdOrderCd(String orderCd);
}