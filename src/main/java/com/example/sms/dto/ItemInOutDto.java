package com.example.sms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemInOutDto {
    // 식별자
    private String id;       // React Key용 유니크 ID (예: "IO-2025..." 또는 "PO-P2025-1")

    // 핵심 데이터
    private String ioCd;     // 입출고 번호 (대기 건은 발주/주문 번호)
    private String ioDt;     // 날짜 (완료: 입출고일, 대기: 발주/주문일) -> 정렬 기준
    private String ioType;   // 구분: IN(입고), OUT(출고), WAIT_IN(입고대기), WAIT_OUT(출고대기)

    // 품목 정보
    private String itemCd;   // 품목 코드
    private String itemNm;   // 품목명 (화면 표시용)
    private String itemSpec; // 규격

    // 수량 및 창고
    private Integer qty;     // 수량
    private String fromWhCd; // 출발 창고
    private String toWhCd;   // 도착 창고

    // 기타
    private String refCd;    // 근거 번호 (발주번호/주문번호)
    private Integer refSeq;  // 근거 순번 (정확한 매칭 위해 필요)
    private String remark;   // 비고

    // 상태 (화면 제어용)
    private String status;   // "COMPLETE"(완료), "WAITING"(대기)
}