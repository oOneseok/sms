package com.example.sms.controller;

import com.example.sms.entity.BomId; // ✅ 복합키 클래스 import 필수
import com.example.sms.entity.BomMst;
import com.example.sms.entity.ItemMst;
import com.example.sms.repository.BomRepository;
import com.example.sms.repository.ItemRepository;
import com.example.sms.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bom")
@RequiredArgsConstructor
public class BomController {

    private final BomRepository bomRepository;
    private final ItemRepository itemRepository;
    private final LogService logService;

    private static final String MENU_NAME = "BOM 관리";

    // 특정 제품의 BOM 조회
    @GetMapping("/{pItemCd}")
    public List<BomMst> getBomList(@PathVariable String pItemCd) {
        // sItem(자재 정보)을 fetch join으로 가져오므로 N+1 문제 없이 조회됨
        return bomRepository.findByPItemCd(pItemCd);
    }

    // 저장 (BOM 등록/수정)
    @PostMapping
    public BomMst saveBom(@RequestBody BomMst bomMst) {

        // 1. [판단 로직] 복합키 객체 생성 (순서: pItemCd, sItemCd, seqNo)
        // BomId 클래스에 @AllArgsConstructor가 있어야 합니다.
        BomId bomId = new BomId(bomMst.getPItemCd(), bomMst.getSItemCd(), bomMst.getSeqNo());

        // 2. DB 존재 여부 확인 -> 등록/수정 결정
        boolean exists = bomRepository.existsById(bomId);
        String actionType = exists ? "수정" : "등록";

        // 3. 저장 (JPA가 알아서 Insert/Update 수행)
        BomMst saved = bomRepository.save(bomMst);

        // 4. [로그용] 이름 조회 (제품명, 자재명)
        String pItemNm = itemRepository.findById(saved.getPItemCd())
                .map(ItemMst::getItemNm).orElse(saved.getPItemCd());

        String sItemNm = itemRepository.findById(saved.getSItemCd())
                .map(ItemMst::getItemNm).orElse(saved.getSItemCd());

        // 5. 로그 저장
        String targetInfo = pItemNm + " (자재: " + sItemNm + ")";
        logService.saveLog(MENU_NAME, actionType, saved.getPItemCd(), targetInfo);

        return saved;
    }

    // 삭제
    @DeleteMapping
    @Transactional
    public void deleteBom(
            @RequestParam String pItemCd,
            @RequestParam String sItemCd,
            @RequestParam Integer seqNo) {

        // 1. [로그용] 이름 조회
        String pItemNm = itemRepository.findById(pItemCd).map(ItemMst::getItemNm).orElse(pItemCd);
        String sItemNm = itemRepository.findById(sItemCd).map(ItemMst::getItemNm).orElse(sItemCd);

        // 2. 삭제 대상 빌드 (또는 deleteSpecificBom 호출)
        BomMst target = BomMst.builder()
                .pItemCd(pItemCd)
                .sItemCd(sItemCd)
                .seqNo(seqNo)
                .build();

        // 3. 삭제
        bomRepository.delete(target);

        // 4. 로그 저장
        String targetInfo = pItemNm + " (자재: " + sItemNm + ")";
        logService.saveLog(MENU_NAME, "삭제", pItemCd, targetInfo);
    }
}