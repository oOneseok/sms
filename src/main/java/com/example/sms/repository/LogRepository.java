package com.example.sms.repository;

import com.example.sms.entity.LogMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LogRepository extends JpaRepository<LogMst, String> {
    List<LogMst> findAllByOrderByLogNoDesc();
}
