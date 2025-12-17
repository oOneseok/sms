package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.math.BigDecimal;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_BOM")
@IdClass(Bom.BomId.class)
public class Bom {

    // 1. 모품목 코드 (PK, FK) - 완제품
    @Id
    @Column(name = "P_ITEM_CD", length = 20)
    private String pItemCd;

    // 2. 자품목 코드 (PK, FK) - 투입 원자재
    @Id
    @Column(name = "S_ITEM_CD", length = 20)
    private String sItemCd;

    // 3. 순번
    @Column(name = "SEQ_NO")
    private Integer seqNo;

    // 4. 소요량
    @Column(name = "USE_QTY")
    private Integer useQty;

    // 5. 로스율 (Decimal 타입 -> BigDecimal 사용 권장)
    @Column(name = "LOSS_RT", precision = 5, scale = 2) // 예: 999.99
    private BigDecimal lossRt;

    // 6. 공정 코드
    @Column(name = "PROC_CD", length = 10)
    private String procCd;

    // --- [복합키 정의 클래스] ---
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BomId implements Serializable {
        private String pItemCd;
        private String sItemCd;
    }

}
