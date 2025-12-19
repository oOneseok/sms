package com.example.sms.repository;

import com.example.sms.entity.ProcMst;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProcRepository extends JpaRepository<ProcMst, String> {
    // 공정코드 또는 공정명으로 검색
    List<ProcMst> findByProcCdContainingOrProcNmContaining(String procCd, String procNm);
}