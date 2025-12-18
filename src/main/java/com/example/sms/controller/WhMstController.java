package com.example.sms.controller;

import com.example.sms.dto.WhMstRequestDto;
import com.example.sms.dto.WhMstResponseDto;
import com.example.sms.service.WhMstService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/whs")
public class WhMstController {

    private final WhMstService whMstService;

    // 목록 + 검색 + 페이징
    // 예: GET /api/whs?keyword=자재&useFlag=Y&whType1=1&page=0&size=20&sort=whCd,asc
    @GetMapping
    public Page<WhMstResponseDto> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String useFlag,
            @RequestParam(required = false) String whType1,
            @RequestParam(required = false) String whType2,
            Pageable pageable
    ) {
        return whMstService.search(keyword, useFlag, whType1, whType2, pageable);
    }

    @GetMapping("/{whCd}")
    public WhMstResponseDto detail(@PathVariable String whCd) {
        return whMstService.findOne(whCd);
    }

    @PostMapping
    public WhMstResponseDto create(@Valid @RequestBody WhMstRequestDto dto) {
        return whMstService.create(dto);
    }

    @PutMapping("/{whCd}")
    public WhMstResponseDto update(@PathVariable String whCd,
                                   @Valid @RequestBody WhMstRequestDto dto) {
        return whMstService.update(whCd, dto);
    }

    @DeleteMapping("/{whCd}")
    public void delete(@PathVariable String whCd) {
        whMstService.delete(whCd);
    }
}
