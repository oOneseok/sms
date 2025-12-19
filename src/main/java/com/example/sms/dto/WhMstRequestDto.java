package com.example.sms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhMstRequestDto {

    @NotBlank
    private String whCd;

    @NotBlank
    private String whNm;

    private String remark;
    private String whType1;
    private String whType2;
    private String useFlag; // "Y"/"N" 권장
}
