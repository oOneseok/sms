package com.example.sms.repository;

import com.example.sms.entity.WhMst;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface WhMstRepository extends JpaRepository<WhMst, String> {

    @Query("""
        select w
        from WhMst w
        where (:keyword is null or :keyword = ''
               or w.whCd like concat('%', :keyword, '%')
               or w.whNm like concat('%', :keyword, '%'))
          and (:useFlag is null or :useFlag = '' or w.useFlag = :useFlag)
          and (:whType1 is null or :whType1 = '' or w.whType1 = :whType1)
          and (:whType2 is null or :whType2 = '' or w.whType2 = :whType2)
        """)
    Page<WhMst> search(@Param("keyword") String keyword,
                       @Param("useFlag") String useFlag,
                       @Param("whType1") String whType1,
                       @Param("whType2") String whType2,
                       Pageable pageable);
}
