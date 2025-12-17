package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_ITEMMST")
public class ItemMst {

    // 1. 품목 코드 (PK)
    @Id
    @Column(name = "ITEM_CD", length = 10)
    private String itemCd;

    // 2. 품목명
    @Column(name = "ITEM_NM", length = 50)
    private String itemNm;

    // 3. 품목 구분 (01:자재, 02:제품 등)
    @Column(name = "ITEM_FLAG", length = 2)
    private String itemFlag;

    // 4. 거래처 코드 (FK)
    @Column(name = "CUST_CD", length = 10)
    private String custCd;

    // 5. 규격
    @Column(name = "ITEM_SPEC", length = 100)
    private String itemSpec;

    // 6. 단위
    @Column(name = "ITEM_UNIT", length = 10)
    private String itemUnit;

    // 7. 단가 (int 타입)
    @Column(name = "ITEM_COST")
    private Integer itemCost;

    // 8. 대분류
    @Column(name = "ITEM_TYPE1", length = 20)
    private String itemType1;

    // 9. 중분류
    @Column(name = "ITEM_TYPE2", length = 20)
    private String itemType2;

    // 10. 소분류
    @Column(name = "ITEM_TYPE3", length = 20)
    private String itemType3;
}
