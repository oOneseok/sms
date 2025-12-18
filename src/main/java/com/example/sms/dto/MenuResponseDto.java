package com.example.sms.dto;

import com.example.sms.entity.MenuMst;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@NoArgsConstructor
public class MenuResponseDto {
    private String menuId;
    private String menuNm;
    private Integer seqNo;
    private String menuIcon;
    private List<MenuResponseDto> children; // 자식 메뉴 리스트

    // Entity -> DTO 변환 생성자
    public MenuResponseDto(MenuMst entity) {
        this.menuId = entity.getMenuId();
        this.menuNm = entity.getMenuNm();
        this.seqNo = entity.getSeqNo();
        this.menuIcon = entity.getMenuIcon();

        // 자식이 있다면 재귀적으로 DTO로 변환
        if (entity.getChildren() != null) {
            this.children = entity.getChildren().stream()
                    .map(MenuResponseDto::new)
                    .collect(Collectors.toList());
        }
    }
}