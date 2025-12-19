package com.example.sms.service;

import com.example.sms.dto.WhMstRequestDto;
import com.example.sms.dto.WhMstResponseDto;
import com.example.sms.entity.WhMst;
import com.example.sms.repository.WhMstRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhMstService {

    private final WhMstRepository whMstRepository;

    public Page<WhMstResponseDto> search(String keyword, String useFlag, String whType1, String whType2, Pageable pageable) {
        return whMstRepository.search(keyword, useFlag, whType1, whType2, pageable)
                .map(WhMstResponseDto::from);
    }

    public WhMstResponseDto findOne(String whCd) {
        WhMst e = whMstRepository.findById(whCd)
                .orElseThrow(() -> new IllegalArgumentException("WH_CD not found: " + whCd));
        return WhMstResponseDto.from(e);
    }

    @Transactional
    public WhMstResponseDto create(WhMstRequestDto dto) {
        if (whMstRepository.existsById(dto.getWhCd())) {
            throw new IllegalArgumentException("이미 존재하는 WH_CD 입니다: " + dto.getWhCd());
        }

        WhMst e = WhMst.builder()
                .whCd(dto.getWhCd())
                .whNm(dto.getWhNm())
                .remark(dto.getRemark())
                .whType1(dto.getWhType1())
                .whType2(dto.getWhType2())
                .useFlag(dto.getUseFlag())
                .build();

        return WhMstResponseDto.from(whMstRepository.save(e));
    }

    @Transactional
    public WhMstResponseDto update(String whCd, WhMstRequestDto dto) {
        WhMst old = whMstRepository.findById(whCd)
                .orElseThrow(() -> new IllegalArgumentException("WH_CD not found: " + whCd));

        // setter 없이 merge(save) 방식
        WhMst updated = WhMst.builder()
                .whCd(old.getWhCd())
                .whNm(dto.getWhNm())
                .remark(dto.getRemark())
                .whType1(dto.getWhType1())
                .whType2(dto.getWhType2())
                .useFlag(dto.getUseFlag())
                .build();

        return WhMstResponseDto.from(whMstRepository.save(updated));
    }

    @Transactional
    public void delete(String whCd) {
        whMstRepository.deleteById(whCd);
    }
}
