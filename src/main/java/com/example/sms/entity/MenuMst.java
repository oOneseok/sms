package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_MENUMST")
public class MenuMst {

    // 1. 메뉴 ID (PK)
    @Id
    @Column(name = "MENU_ID", length = 5)
    private String menuId;

    // 2. 메뉴명
    @Column(name = "MENU_NM", length = 50, nullable = false)
    private String menuNm;

    // 3. 순서 (화면에 보여질 순서)
    @Column(name = "SEQ_NO")
    private Integer seqNo;

    // 아이콘 정보
    @Column(name = "MENU_ICON")
    private String menuIcon;

    @Column(name = "MENU_URL")
    private String menuUrl;

    // 4. 부모 메뉴 (내 상위 메뉴는 하나다)
    // DB의 'PARENT_ID' 컬럼이 내 부모의 'MENU_ID'를 가리킴
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PARENT_ID")
    private MenuMst parent;

    // 5. 자식 메뉴들 (내 하위 메뉴는 여러 개다)
    // 부모 엔티티의 'parent' 필드에 의해 매핑됨
    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    @OrderBy("seqNo ASC")
    @Builder.Default
    private List<MenuMst> children = new ArrayList<>();

    // 자식 메뉴를 추가할 때 부모-자식 양쪽에 값을 세팅해주는 메서드
    public void addChild(MenuMst child) {
        this.children.add(child);
        child.setParent(this);
    }

    private void setParent(MenuMst parent) {
        this.parent = parent;
    }

    //이 엔티티 컨트롤러에서 리액트로 리턴하면 무한 루프에 빠지므로 DTO를 만들어서 필요한 데이터만 보내는 과정이 필요함
}
