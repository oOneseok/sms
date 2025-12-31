package com.example.sms.dto;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
public class ProdReceiveReq {
    // 여러 창고에 나누어 넣기 위한 리스트
    private List<ReceiveAlloc> allocations;
    private String remark;

    @Getter @Setter
    public static class ReceiveAlloc {
        private String whCd;
        private BigDecimal qty;
    }
}