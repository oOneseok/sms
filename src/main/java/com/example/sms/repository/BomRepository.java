package com.example.sms.repository;

import com.example.sms.entity.BomId; // 복합키 클래스 import
import com.example.sms.entity.BomMst;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

// 1. [중요] ID 타입을 String -> BomId로 변경
public interface BomRepository extends JpaRepository<BomMst, BomId> {

    // 조회: 특정 제품의 BOM 목록 (기존 유지)
    @Query("SELECT b FROM BomMst b JOIN FETCH b.sItem WHERE b.pItemCd = :pItemCd ORDER BY b.seqNo ASC")
    List<BomMst> findByPItemCd(@Param("pItemCd") String pItemCd);

    // 삭제 1: 품목 삭제 시 관련 BOM 전체 삭제 (기존 유지)
    @Modifying
    @Query("DELETE FROM BomMst b WHERE b.pItemCd = :itemCd OR b.sItemCd = :itemCd")
    void deleteByItemCd(@Param("itemCd") String itemCd);

    // 삭제 2: [신규] 특정 BOM 한 줄만 삭제 (복합키 파라미터 사용)
    // 화면에서 삭제 버튼 누를 때 사용
    @Modifying
    @Query("DELETE FROM BomMst b WHERE b.pItemCd = :pItemCd AND b.sItemCd = :sItemCd AND b.seqNo = :seqNo")
    void deleteSpecificBom(@Param("pItemCd") String pItemCd,
                           @Param("sItemCd") String sItemCd,
                           @Param("seqNo") Integer seqNo);
}