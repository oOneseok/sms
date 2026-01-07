package com.example.sms.repository;

import com.example.sms.entity.ItemMst;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ItemRepository extends JpaRepository<ItemMst, String> {

    // 1. 검색어만 있을 때 (대소문자 무시)
    @Query(value = """
        SELECT * FROM TB_ITEMMST i
        WHERE (
            UPPER(i.ITEM_NM) LIKE '%' || UPPER(:searchText) || '%'
            OR
            UPPER(i.ITEM_CD) LIKE '%' || UPPER(:searchText) || '%'
        )
    """, nativeQuery = true)
    List<ItemMst> searchByText(@Param("searchText") String searchText);

    // 2. 분류만 있을 때 (Native Query로 공백/타입 문제 해결)
    @Query(value = """
        SELECT * FROM TB_ITEMMST i
        WHERE i.TYPE_CD IN (:typeCds)
    """, nativeQuery = true)
    List<ItemMst> findByTypeCdIn(@Param("typeCds") List<String> typeCds);

    // 3. 분류 + 검색어 (대소문자 무시)
    @Query(value = """
        SELECT * FROM TB_ITEMMST i
        WHERE i.TYPE_CD IN (:typeCds)
        AND (
            UPPER(i.ITEM_NM) LIKE '%' || UPPER(:searchText) || '%'
            OR
            UPPER(i.ITEM_CD) LIKE '%' || UPPER(:searchText) || '%'
        )
    """, nativeQuery = true)
    List<ItemMst> searchByTypesAndText(@Param("typeCds") List<String> typeCds,
                                       @Param("searchText") String searchText);

    @Query(value = """
    SELECT * FROM TB_ITEMMST i
    WHERE i.ITEM_FLAG = :itemFlag
    ORDER BY i.ITEM_CD
""", nativeQuery = true)
    List<ItemMst> findByItemFlag(@Param("itemFlag") String itemFlag);


    void deleteByTypeCd(String typeCd);
}