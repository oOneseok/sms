package com.example.sms.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderDetDto {

    @JsonAlias({"ORDER_CD", "orderCd"})
    private String orderCd;

    @JsonAlias({"SEQ_NO", "seqNo"})
    private Integer seqNo;

    @JsonAlias({"ITEM_CD", "itemCd"})
    private String itemCd;

    // ✅ 추가: 품목명
    @JsonAlias({"ITEM_NM", "itemNm"})
    private String itemNm;

    @JsonAlias({"ORDER_QTY", "orderQty"})
    private Integer orderQty;

    // ✅ 추가: 출고창고
    @JsonAlias({"WH_CD", "whCd"})
    private String whCd;

    @JsonAlias({"STATUS", "status"})
    private String status;

    @JsonAlias({"REMARK", "remark"})
    private String remark;
}
