package com.example.sms.controller;

import com.example.sms.entity.ItemTypeMst;
import com.example.sms.repository.ItemTypeRepository;
import com.example.sms.repository.ItemRepository;
import com.example.sms.service.LogService; // ✅ 로그 서비스 임포트
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/item-types")
@RequiredArgsConstructor
public class ItemTypeController {

    private final ItemTypeRepository itemTypeRepository;
    private final ItemRepository itemRepository;
    private final LogService logService; // ✅ 로그 서비스 주입

    private static final String MENU_NAME = "자재 분류 관리"; // ✅ 메뉴명 정의

    // 1. 트리 조회
    @GetMapping
    public List<ItemTypeMst> getItemTypeTree() {
        return itemTypeRepository.findByParentIsNullOrderByTypeCdAsc();
    }

    // 2. ✅ 분류 저장 (신규/수정) + 로그
    @PostMapping
    public ResponseEntity<ItemTypeMst> saveItemType(@RequestBody Map<String, Object> payload) {
        String typeCd = (String) payload.get("typeCd");
        String typeNm = (String) payload.get("typeNm");
        String parentTypeCd = (String) payload.get("parentType");

        // 유효성 검사
        if (typeCd == null || typeCd.isBlank()) throw new IllegalArgumentException("코드 필수");

        boolean isExists = itemTypeRepository.existsById(typeCd);
        String actionType = isExists ? "수정" : "등록";

        // 부모 조회
        ItemTypeMst parent = null;
        if (parentTypeCd != null && !parentTypeCd.isBlank()) {
            parent = itemTypeRepository.findById(parentTypeCd)
                    .orElseThrow(() -> new IllegalArgumentException("부모 분류가 없습니다."));
        }

        ItemTypeMst itemType = ItemTypeMst.builder()
                .typeCd(typeCd)
                .typeNm(typeNm)
                .parent(parent)
                .build();

        ItemTypeMst saved = itemTypeRepository.save(itemType);

        // ✅ 로그 기록
        logService.saveLog(MENU_NAME, actionType, saved.getTypeCd(), saved.getTypeNm());

        return ResponseEntity.ok(saved);
    }

    // 3. ✅ 분류 삭제 + 로그
    @DeleteMapping("/{typeCd}")
    @Transactional
    public ResponseEntity<Void> deleteItemType(@PathVariable String typeCd) {
        ItemTypeMst target = itemTypeRepository.findById(typeCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 분류입니다."));

        String targetName = target.getTypeNm();

        // 하위 아이템 삭제 로직 (기존 유지)
        deleteItemsInTypeRecursive(target);

        // 분류 삭제
        itemTypeRepository.delete(target);

        // ✅ 로그 기록
        logService.saveLog(MENU_NAME, "삭제", typeCd, targetName);

        return ResponseEntity.ok().build();
    }

    // 재귀 삭제 헬퍼 (기존 유지)
    private void deleteItemsInTypeRecursive(ItemTypeMst type) {
        if (type.getChildren() != null) {
            for (ItemTypeMst child : type.getChildren()) {
                deleteItemsInTypeRecursive(child);
            }
        }
        itemRepository.deleteByTypeCd(type.getTypeCd());
    }
}