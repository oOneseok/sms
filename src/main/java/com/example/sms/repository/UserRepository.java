package com.example.sms.repository;

import com.example.sms.entity.UserMst;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserMst, String> {
    Optional<UserMst> findByUserId(String userId);
}