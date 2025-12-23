package com.example.sms.repository;

import com.example.sms.entity.ItemStock;
import com.example.sms.entity.ItemStockId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ItemStockRepository extends JpaRepository<ItemStock, ItemStockId> {

    // GET /api/stocks?itemCd=&whCd=
    @Query("""
        select s
        from ItemStock s
        where (:itemCd is null or s.id.itemCd = :itemCd)
          and (:whCd is null or s.id.whCd = :whCd)
    """)
    Page<ItemStock> search(@Param("itemCd") String itemCd,
                           @Param("whCd") String whCd,
                           Pageable pageable);
}
