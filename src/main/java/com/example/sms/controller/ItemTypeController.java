package com.example.sms.controller;

import com.example.sms.entity.ItemTypeMst;
import com.example.sms.repository.ItemTypeRepository;
import com.example.sms.repository.ItemRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
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
    private final LogService logService;

    private static final String MENU_NAME = "자재 분류 관리";

    // 1. 트리 조회
    @GetMapping
    public List<ItemTypeMst> getItemTypeTree() {
        return itemTypeRepository.findByParentIsNullOrderByTypeCdAsc();
    }

    // 2. 분류 저장 (신규/수정)
    @PostMapping
    public ItemTypeMst saveItemType(@RequestBody Map<String, Object> payload) {
        String typeCd = (String) payload.get("typeCd");
        String typeNm = (String) payload.get("typeNm");
        String typeLv = (String) payload.get("typeLv");
        String parentTypeCd = (String) payload.get("parentType");

        boolean isExists = itemTypeRepository.existsById(typeCd);
        String actionType = isExists ? "수정" : "등록";

        ItemTypeMst parent = null;
        if (parentTypeCd != null && !parentTypeCd.isEmpty()) {
            parent = itemTypeRepository.findById(parentTypeCd)
                    .orElseThrow(() -> new IllegalArgumentException("부모 분류가 없습니다."));
        }

        ItemTypeMst itemType = ItemTypeMst.builder()
                .typeCd(typeCd)
                .typeNm(typeNm)
                .typeLv(typeLv)
                .parent(parent)
                .build();

        ItemTypeMst saved = itemTypeRepository.save(itemType);

        // 3. [로그 저장]
        logService.saveLog(MENU_NAME, actionType, saved.getTypeCd(), saved.getTypeNm());

        return saved;
    }

    // 3. 분류 삭제
    @DeleteMapping("/{typeCd}")
    @Transactional
    public void deleteItemType(@PathVariable String typeCd) {
        ItemTypeMst target = itemTypeRepository.findById(typeCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 분류입니다."));

        // 1. [로그용] 삭제될 분류의 이름을 미리 저장해둠 (삭제 후엔 조회 불가하므로)
        String targetName = target.getTypeNm();

        // 2. 상위 분류가 있는지 확인 (중분류인지 대분류인지)
        if (target.getParent() != null) {
            // [Case A: 중분류 삭제] -> 상위(대분류)로 아이템 이동
            String parentCd = target.getParent().getTypeCd();
            itemRepository.updateTypeCd(typeCd, parentCd);
            System.out.println("✅ 아이템 이동: " + typeCd + " -> " + parentCd);

            // 중분류 삭제 (JPA가 처리)
            itemTypeRepository.delete(target);

        } else {
            // [Case B: 대분류 삭제] -> 하위(중분류) 아이템 + 내 아이템 모두 삭제

            // 1) 자식 분류(중분류)들에 속한 아이템들 먼저 삭제
            for (ItemTypeMst child : target.getChildren()) {
                itemRepository.deleteByTypeCd(child.getTypeCd());
            }

            // 2) 대분류(나 자신)에 속한 아이템 삭제
            itemRepository.deleteByTypeCd(typeCd);
            System.out.println("🗑️ 대분류 및 하위 전체 아이템 삭제 완료");

            // 3) 대분류 삭제 (Entity의 cascade 설정 덕분에 자식 분류(중분류)도 자동 삭제됨)
            itemTypeRepository.delete(target);
        }

        // 3. [로그 저장] 모든 삭제 로직이 정상 처리된 후 기록
        logService.saveLog(MENU_NAME, "삭제", typeCd, targetName);
    }
}