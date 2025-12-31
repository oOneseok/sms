// ProdReserveReq.java
package com.example.sms.dto;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
public class ProdReserveReq {
    private String remark;
    // 자재별 창고 할당 리스트
    private List<ManualAlloc> allocations;

    @Getter @Setter
    public static class ManualAlloc {
        private String itemCd; // 자재코드
        private String whCd;   // 창고코드
        private BigDecimal qty; // 사용할 수량
    }
}