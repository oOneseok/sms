package com.example.sms.controller;

import com.example.sms.entity.ItemMst;
import com.example.sms.repository.ItemRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/item")
@RequiredArgsConstructor
public class ItemController {

    private final ItemRepository itemRepository;
    private final LogService logService;
    private static final String MENU_NAME = "품목 관리";

    // 1. 조회
    @GetMapping
    public List<ItemMst> getItemList(@RequestParam(required = false, defaultValue = "") String searchText) {
        if (searchText.isEmpty()) {
            return itemRepository.findAll();
        } else {
            return itemRepository.findByItemCdContainingOrItemNmContaining(searchText, searchText);
        }
    }

    // 2. 저장
    @PostMapping
    public ItemMst saveItem(@RequestBody ItemMst itemMst) {
        boolean isExists = itemRepository.existsById(itemMst.getItemCd());
        String actionType = isExists ? "수정" : "등록";

        ItemMst saved = itemRepository.save(itemMst);

        logService.saveLog(MENU_NAME, actionType, saved.getItemCd(), saved.getItemNm());
        return saved;
    }

    // 3. 삭제
    @DeleteMapping("/{itemCd}")
    public void deleteItem(@PathVariable String itemCd) {
        ItemMst target = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("대상 품목이 없습니다."));
        String targetName = target.getItemNm();

        itemRepository.delete(target);
        logService.saveLog(MENU_NAME, "삭제", itemCd, targetName);
    }
}