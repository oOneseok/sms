package com.example.sms.repository;

import com.example.sms.entity.ItemTypeMst;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemTypeRepository extends JpaRepository<ItemTypeMst, String> {

    // 1. 최상위(Root) 분류 조회 (트리 구성용)
    List<ItemTypeMst> findByParentIsNullOrderByTypeCdAsc();

    // 2. 특정 부모를 가진 자식 분류 조회 (JPA Naming Rule: Parent 객체의 TypeCd 필드 검색)
    // 🚨 스크린샷 에러 해결을 위한 메소드 정의
    List<ItemTypeMst> findByParent_TypeCdOrderByTypeCdAsc(String parentTypeCd);
}