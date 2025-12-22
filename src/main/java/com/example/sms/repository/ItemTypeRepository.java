package com.example.sms.repository;

import com.example.sms.entity.ItemTypeMst;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemTypeRepository extends JpaRepository<ItemTypeMst, String> {
    List<ItemTypeMst> findByParentIsNullOrderByTypeCdAsc();
}