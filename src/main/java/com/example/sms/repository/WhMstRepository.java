package com.example.sms.repository;

import com.example.sms.entity.WhMst;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WhMstRepository extends JpaRepository<WhMst, String> {
    // 검색: 창고명 또는 창고코드로 조회
    List<WhMst> findByWhNmContainingOrWhCdContaining(String whNm, String whCd);
}