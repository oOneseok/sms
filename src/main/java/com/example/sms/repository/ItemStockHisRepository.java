package com.example.sms.repository;

import com.example.sms.entity.ItemStockHis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface ItemStockHisRepository extends JpaRepository<ItemStockHis, String> {

    // 이력 조회 + 기간 필터
    @Query("""
        select h
        from ItemStockHis h
        where (:itemCd is null or h.itemCd = :itemCd)
          and (:whCd is null or h.whCd = :whCd)
          and (:fromDt is null or h.trxDt >= :fromDt)
          and (:toDt is null or h.trxDt <= :toDt)
        order by h.trxDt desc
    """)
    Page<ItemStockHis> search(@Param("itemCd") String itemCd,
                              @Param("whCd") String whCd,
                              @Param("fromDt") LocalDateTime fromDt,
                              @Param("toDt") LocalDateTime toDt,
                              Pageable pageable);
}
