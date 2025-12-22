package com.example.sms.controller;

import com.example.sms.entity.BomMst;
import com.example.sms.repository.BomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bom")
@RequiredArgsConstructor
public class BomController {

    private final BomRepository bomRepository;

    // 특정 제품의 BOM 조회
    @GetMapping("/{pItemCd}")
    public List<BomMst> getBomList(@PathVariable String pItemCd) {
        return bomRepository.findByPItemCd(pItemCd);
    }

    // 저장 (BOM 등록/수정)
    @PostMapping
    public BomMst saveBom(@RequestBody BomMst bomMst) {
        // 복합키인 경우 save 호출 시 PK가 다 있으면 update, 없으면 insert
        return bomRepository.save(bomMst);
    }

    // 삭제 (복합키 파라미터 필요)
    // 예: DELETE /api/bom?pItemCd=P1&sItemCd=M1&seqNo=1
    @DeleteMapping
    public void deleteBom(
            @RequestParam String pItemCd,
            @RequestParam String sItemCd,
            @RequestParam Integer seqNo) {

        // 엔티티를 만들어서 삭제 태움
        BomMst target = BomMst.builder()
                .pItemCd(pItemCd)
                .sItemCd(sItemCd)
                .seqNo(seqNo)
                .build();
        bomRepository.delete(target);
    }
}