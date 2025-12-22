package com.example.sms.repository;

import com.example.sms.entity.ItemMst;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ItemRepository extends JpaRepository<ItemMst, String> {
    // 품목코드 또는 품목명으로 검색
    List<ItemMst> findByItemCdContainingOrItemNmContaining(String itemCd, String itemNm);

    @Modifying
    @Query("UPDATE ItemMst i SET i.typeCd = :newTypeCd WHERE i.typeCd = :oldTypeCd")
    void updateTypeCd(@Param("oldTypeCd") String oldTypeCd, @Param("newTypeCd") String newTypeCd);

    @Modifying
    @Query("DELETE FROM ItemMst i WHERE i.typeCd = :typeCd")
    void deleteByTypeCd(@Param("typeCd") String typeCd);
}