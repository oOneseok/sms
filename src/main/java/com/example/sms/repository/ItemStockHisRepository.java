package com.example.sms.repository;

import com.example.sms.entity.ItemStockHis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ItemStockHisRepository extends JpaRepository<ItemStockHis, String> {

    // 1. 단순 목록 조회 (기존)
    List<ItemStockHis> findByItemCdOrderByTrxDtDesc(String itemCd);
    List<ItemStockHis> findByWhCdOrderByTrxDtDesc(String whCd);

    // 2. ✅ [추가] 복합 검색 (컨트롤러의 search 메소드 대응)
    @Query("SELECT h FROM ItemStockHis h " +
            "WHERE (:itemCd IS NULL OR h.itemCd = :itemCd) " +
            "AND (:whCd IS NULL OR h.whCd = :whCd) " +
            "AND (:fromDt IS NULL OR h.trxDt >= :fromDt) " +
            "AND (:toDt IS NULL OR h.trxDt <= :toDt) " +
            "ORDER BY h.trxDt DESC")
    Page<ItemStockHis> search(@Param("itemCd") String itemCd,
                              @Param("whCd") String whCd,
                              @Param("fromDt") LocalDateTime fromDt,
                              @Param("toDt") LocalDateTime toDt,
                              Pageable pageable);
}