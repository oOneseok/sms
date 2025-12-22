package com.example.sms.controller;

import com.example.sms.entity.ItemMst;
import com.example.sms.repository.BomRepository;
import com.example.sms.repository.ItemRepository;
import com.example.sms.service.LogService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/item")
@RequiredArgsConstructor
public class ItemController {

    private final ItemRepository itemRepository;
    private final LogService logService;
    private final BomRepository bomRepository;
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
        // A. 신규인지 수정인지 판단 로직 (DB에 해당 ID가 없으면 등록, 있으면 수정으로 간주)
        boolean isExists = itemRepository.existsById(itemMst.getItemCd());
        String actionType = isExists ? "수정" : "등록";

        // B. DB 저장
        ItemMst saved = itemRepository.save(itemMst);

        // C. 로그 저장
        logService.saveLog(MENU_NAME, actionType, saved.getItemCd(), saved.getItemNm());
        return saved;
    }

    // 3. 삭제
    @Transactional
    @DeleteMapping("/{itemCd}")
    public void deleteItem(@PathVariable String itemCd) {
        // A. 삭제 전에 이름을 알아내야 로그에 남길 수 있음! (DB에서 조회 먼저 수행)
        ItemMst target = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("대상 품목이 없습니다."));
        String targetName = target.getItemNm();

        // B. 삭제 수행
        bomRepository.deleteByItemCd(itemCd);
        itemRepository.delete(target);
        // C. 로그 저장 (삭제된 아이템의 이름을 같이 넘겨줌)
        logService.saveLog(MENU_NAME, "삭제", itemCd, targetName);
    }
}