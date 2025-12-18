package com.example.sms.repository;

import com.example.sms.entity.CompMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompRepository extends JpaRepository<CompMst, String> {
    // 사업장명이나 사업자번호로 검색
    List<CompMst> findByCompNmContainingOrBizNoContaining(String compNm, String bizNo);
}