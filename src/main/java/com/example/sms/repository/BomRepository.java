package com.example.sms.repository;

import com.example.sms.entity.BomMst;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BomRepository extends JpaRepository<BomMst, String> {

    // 특정 제품(Parent)에 속한 BOM 목록 조회 (자재 정보 포함)
    @Query("SELECT b FROM BomMst b JOIN FETCH b.sItem WHERE b.pItemCd = :pItemCd ORDER BY b.seqNo ASC")
    List<BomMst> findByPItemCd(@Param("pItemCd") String pItemCd);

    @Modifying
    @Query("DELETE FROM BomMst b WHERE b.pItemCd = :itemCd OR b.sItemCd = :itemCd")
    void deleteByItemCd(@Param("itemCd") String itemCd);
}