package com.example.sms.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_BOM")
@IdClass(BomId.class) // 복합키 설정
public class BomMst {

    @Id
    @JsonProperty("pItemCd")
    @Column(name = "P_ITEM_CD", length = 20)
    private String pItemCd; // 제품 코드

    @Id
    @JsonProperty("sItemCd")
    @Column(name = "S_ITEM_CD", length = 20)
    private String sItemCd; // 자재 코드

    @Id
    @Column(name = "SEQ_NO")
    private Integer seqNo;  // 순번

    // 자재 정보를 가져오기 위한 조인 (Insert/Update 시에는 sItemCd만 쓰지만, 조회 시 필요)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "S_ITEM_CD", insertable = false, updatable = false)
    private ItemMst sItem;

    @Column(name = "USE_QTY")
    private Double useQty; // 소요량

    @Column(name = "LOSS_RT")
    private Double lossRt; // Loss율

    @Column(name = "PROC_CD")
    private String procCd; // 공정 코드

    @Column(name = "REMARK")
    private String remark;
}