package com.example.sms.repository;

import com.example.sms.entity.OrderDetIdMst;
import com.example.sms.entity.OrderDetMst;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderDetMstRepository extends JpaRepository<OrderDetMst, OrderDetIdMst> {

    // 주문코드로 상세 조회 (기존)
    List<OrderDetMst> findByIdOrderCdOrderByIdSeqNoAsc(String orderCd);

    // 주문코드 기준 삭제 (기존)
    void deleteByIdOrderCd(String orderCd);

    // ✅ 전체/검색 공용 (orderCd/itemCd는 부분검색, status는 정확검색)
    @Query("""
        SELECT d
        FROM OrderDetMst d
        WHERE (:orderCd IS NULL OR :orderCd = '' OR d.id.orderCd LIKE CONCAT('%', :orderCd, '%'))
          AND (:itemCd IS NULL OR :itemCd = '' OR d.itemCd LIKE CONCAT('%', :itemCd, '%'))
          AND (:status IS NULL OR :status = '' OR d.status = :status)
        ORDER BY d.id.orderCd ASC, d.id.seqNo ASC
    """)
    List<OrderDetMst> search(
            @Param("orderCd") String orderCd,
            @Param("itemCd") String itemCd,
            @Param("status") String status
    );
}
