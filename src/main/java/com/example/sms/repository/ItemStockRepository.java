package com.example.sms.repository;

import com.example.sms.entity.ItemStock;
import com.example.sms.entity.ItemStockId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ItemStockRepository extends JpaRepository<ItemStock, ItemStockId> {

    // 기존: GET /api/stocks?itemCd=&whCd=
    @Query("""
        select s
        from ItemStock s
        where (:itemCd is null or s.id.itemCd = :itemCd)
          and (:whCd is null or s.id.whCd = :whCd)
    """)
    Page<ItemStock> search(@Param("itemCd") String itemCd,
                           @Param("whCd") String whCd,
                           Pageable pageable);

    // ✅ 추가1) 품목 하나의 창고별 재고 목록
    List<ItemStock> findByIdItemCd(String itemCd);

    // ✅ 추가2) 품목 기준 합산 목록 (같은 ITEM이 여러 창고면 합쳐서 보여주기)
    interface StockSummaryView {
        String getItemCd();
        BigDecimal getStockQty();
        BigDecimal getAllocQty();
        Long getWhCnt(); // 창고 개수
    }

    @Query("""
        select
          s.id.itemCd as itemCd,
          coalesce(sum(s.stockQty), 0) as stockQty,
          coalesce(sum(s.allocQty), 0) as allocQty,
          count(distinct s.id.whCd) as whCnt
        from ItemStock s
        group by s.id.itemCd
        order by s.id.itemCd
    """)
    List<StockSummaryView> summary();
}
