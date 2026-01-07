package com.example.sms.controller;

import com.example.sms.dto.ItemResponseDto;
import com.example.sms.entity.ItemMst;
import com.example.sms.entity.ItemTypeMst;
import com.example.sms.repository.ItemRepository;
import com.example.sms.repository.ItemTypeRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/item")
@RequiredArgsConstructor
public class ItemController {

    private final ItemRepository itemRepository;
    private final ItemTypeRepository itemTypeRepository;
    private final LogService logService;

    private static final String MENU_NAME = "품목 관리";

    // ✅ 발주관리 자재팝업용: 자재(ITEM_FLAG=01)만 조회
    // GET /api/item/materials
    @GetMapping("/materials")
    public List<ItemResponseDto> getMaterials() {

        // 분류 경로 표시도 같이 하려면 typeMap 필요
        List<ItemTypeMst> allTypes = itemTypeRepository.findAll();
        Map<String, ItemTypeMst> typeMap = allTypes.stream()
                .collect(Collectors.toMap(ItemTypeMst::getTypeCd, Function.identity()));

        List<ItemMst> items = itemRepository.findByItemFlag("01");

        return items.stream()
                .map(item -> {
                    String path = buildTypePath(item.getTypeCd(), typeMap);
                    return ItemResponseDto.fromEntity(item, path);
                })
                .collect(Collectors.toList());
    }

    // ✅ 주문관리 제품팝업용: 제품(ITEM_FLAG=02)만 조회
    // GET /api/item/products
    @GetMapping("/products")
    public List<ItemResponseDto> getProducts() {

        // 분류 경로 표시도 같이 하려면 typeMap 필요
        List<ItemTypeMst> allTypes = itemTypeRepository.findAll();
        Map<String, ItemTypeMst> typeMap = allTypes.stream()
                .collect(Collectors.toMap(ItemTypeMst::getTypeCd, Function.identity()));

        List<ItemMst> items = itemRepository.findByItemFlag("02");

        return items.stream()
                .map(item -> {
                    String path = buildTypePath(item.getTypeCd(), typeMap);
                    return ItemResponseDto.fromEntity(item, path);
                })
                .collect(Collectors.toList());
    }

    // 1. 아이템 목록 조회 (기존 그대로)
    @GetMapping
    public List<ItemResponseDto> getItemList(
            @RequestParam(required = false, defaultValue = "") String searchText,
            @RequestParam(required = false) String typeCd
    ) {
        // 1. 모든 분류 정보 로딩 (경로 표시용)
        List<ItemTypeMst> allTypes = itemTypeRepository.findAll();
        Map<String, ItemTypeMst> typeMap = allTypes.stream()
                .collect(Collectors.toMap(ItemTypeMst::getTypeCd, Function.identity()));

        List<ItemMst> items;

        // Case A: 분류 필터가 없을 때
        if (typeCd == null || typeCd.isEmpty()) {
            if (searchText.isEmpty()) {
                items = itemRepository.findAll();
            } else {
                items = itemRepository.searchByText(searchText);
            }
        }
        // Case B: 분류 필터가 있을 때
        else {
            List<String> targetTypeCds = new ArrayList<>();
            collectSubTypesInMemory(allTypes, typeCd, targetTypeCds);

            if (searchText.isEmpty()) {
                items = itemRepository.findByTypeCdIn(targetTypeCds);
            } else {
                items = itemRepository.searchByTypesAndText(targetTypeCds, searchText);
            }
        }

        // 2. DTO 변환 (분류 경로 포함)
        return items.stream()
                .map(item -> {
                    String path = buildTypePath(item.getTypeCd(), typeMap);
                    return ItemResponseDto.fromEntity(item, path);
                })
                .collect(Collectors.toList());
    }

    // 2. 저장 (기존 그대로)
    @PostMapping
    public ResponseEntity<ItemMst> saveItem(@RequestBody ItemMst item) {
        if (item.getItemCd() == null || item.getItemCd().isBlank()) {
            throw new IllegalArgumentException("품목 코드는 필수입니다.");
        }
        boolean exists = itemRepository.existsById(item.getItemCd());
        String actionType = exists ? "수정" : "등록";

        ItemMst saved = itemRepository.save(item);
        logService.saveLog(MENU_NAME, actionType, saved.getItemCd(), saved.getItemNm());

        return ResponseEntity.ok(saved);
    }

    // 3. 삭제 (기존 그대로)
    @DeleteMapping("/{itemCd}")
    @Transactional
    public ResponseEntity<Void> deleteItem(@PathVariable String itemCd) {
        ItemMst target = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목입니다."));

        itemRepository.delete(target);
        logService.saveLog(MENU_NAME, "삭제", target.getItemCd(), target.getItemNm());

        return ResponseEntity.ok().build();
    }

    // --- Helper Methods ---
    private String buildTypePath(String currentTypeCd, Map<String, ItemTypeMst> typeMap) {
        if (currentTypeCd == null || !typeMap.containsKey(currentTypeCd)) return "-";
        List<String> pathNames = new ArrayList<>();
        ItemTypeMst current = typeMap.get(currentTypeCd);
        while (current != null) {
            pathNames.add(0, current.getTypeNm());
            if (current.getParent() != null) {
                current = typeMap.get(current.getParent().getTypeCd());
            } else {
                current = null;
            }
        }
        return String.join(" > ", pathNames);
    }

    private void collectSubTypesInMemory(List<ItemTypeMst> allTypes, String currentCd, List<String> result) {
        result.add(currentCd);
        for (ItemTypeMst type : allTypes) {
            if (type.getParent() != null && Objects.equals(type.getParent().getTypeCd(), currentCd)) {
                collectSubTypesInMemory(allTypes, type.getTypeCd(), result);
            }
        }
    }
}
