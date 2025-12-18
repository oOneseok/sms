package com.example.sms.repository;

import com.example.sms.entity.MenuMst;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<MenuMst, String> {
    // 부모가 없는 최상위 메뉴(Tabs)를 순서대로 조회
    List<MenuMst> findAllByParentIsNullOrderBySeqNoAsc();
}
