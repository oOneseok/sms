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
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ItemTypeMst {

    @Id
    @Column(name = "TYPE_CD", length = 20)
    private String typeCd;

    @Column(name = "TYPE_NM")
    private String typeNm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PARENT_TYPE")
    @JsonIgnoreProperties("children") // 무한 루프 방지용 (기존 유지)
    private ItemTypeMst parent;

    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    @OrderBy("typeCd ASC")
    @JsonIgnoreProperties("parent") // 무한 루프 방지용 (기존 유지)
    @Builder.Default
    private List<ItemTypeMst> children = new ArrayList<>();
}