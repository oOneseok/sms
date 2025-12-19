package com.example.sms.repository;

import com.example.sms.entity.ItemMst;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemRepository extends JpaRepository<ItemMst, String> {
    // 품목코드 또는 품목명으로 검색
    List<ItemMst> findByItemCdContainingOrItemNmContaining(String itemCd, String itemNm);
}