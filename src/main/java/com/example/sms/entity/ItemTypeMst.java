package com.example.sms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ITEMTYPEMST")
public class ItemTypeMst {

    @Id
    @Column(name = "TYPE_CD", length = 20)
    private String typeCd; // 분류 코드 (PK)

    @Column(name = "TYPE_NM")
    private String typeNm; // 분류명 (육류, 유제품 등)

    @Column(name = "TYPE_LV")
    private String typeLv; // 1:대, 2:중, 3:소

    // 부모 분류 (Self Reference)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PARENT_TYPE")
    @JsonIgnoreProperties("children")
    @ToString.Exclude
    private ItemTypeMst parent;

    // 자식 분류들
    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("typeCd ASC")
    @ToString.Exclude
    @Builder.Default
    private List<ItemTypeMst> children = new ArrayList<>();
}