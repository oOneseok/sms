package com.example.sms.dto;

import com.example.sms.entity.ItemMst;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ItemResponseDto {
    private String itemCd;
    private String itemNm;
    private String itemFlag;
    private String itemSpec;
    private String itemUnit;
    private Double itemCost;
    private Integer minQty;
    private Integer maxQty;
    private String remark;

    // 핵심 추가: 분류 정보
    private String typeCd;      // 현재 분류 코드
    private String typePath;    // 분류 경로 (예: 원자재 > 철강 > 판재)

    // Entity -> DTO 변환 메서드
    public static ItemResponseDto fromEntity(ItemMst entity, String calculatedPath) {
        return ItemResponseDto.builder()
                .itemCd(entity.getItemCd())
                .itemNm(entity.getItemNm())
                .itemFlag(entity.getItemFlag())
                .itemSpec(entity.getItemSpec())
                .itemUnit(entity.getItemUnit())
                .itemCost(entity.getItemCost())
                .minQty(entity.getMinQty())
                .maxQty(entity.getMaxQty())
                .remark(entity.getRemark())
                .typeCd(entity.getTypeCd())
                .typePath(calculatedPath) // 계산된 경로 주입
                .build();
    }
}