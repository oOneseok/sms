package com.example.sms.repository;

import com.example.sms.entity.Prod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ProdRepository extends JpaRepository<Prod, String> {

    @Query("""
        select p
        from Prod p
        where (:itemCd is null or p.itemCd = :itemCd)
          and (:status is null or p.status = :status)
    """)
    Page<Prod> search(@Param("itemCd") String itemCd,
                      @Param("status") String status,
                      Pageable pageable);
}
