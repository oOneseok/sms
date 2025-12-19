package com.example.sms.repository;

import com.example.sms.entity.CustMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustRepository extends JpaRepository<CustMst, String> {

    List<CustMst> findByBizFlag(String bizFlag);

    List<CustMst> findByBizFlagAndCustNmContainingOrBizFlagAndBizNoContaining(
            String bizFlag1, String custNm,
            String bizFlag2, String bizNo
    );
}
