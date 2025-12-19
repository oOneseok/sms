package com.example.sms.dto;

import com.example.sms.entity.WhMst;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhMstResponseDto {

    private String whCd;
    private String whNm;

    private String remark;
    private String whType1;
    private String whType2;
    private String useFlag;

    public static WhMstResponseDto from(WhMst e) {
        return WhMstResponseDto.builder()
                .whCd(e.getWhCd())
                .whNm(e.getWhNm())
                .remark(e.getRemark())
                .whType1(e.getWhType1())
                .whType2(e.getWhType2())
                .useFlag(e.getUseFlag())
                .build();
    }
}
