package com.example.sms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Getter
@Setter
@ToString
@Table(name = "TB_CUSTMST")
public class CustMst {
    // 1. 거래처 CD (PK)
    @Id
    @Column(name = "CUST_CD", length = 10)
    private String custCd;

    // 2. 거래처명
    @Column(name = "CUST_NM", length = 50, nullable = false)
    private String custNm;

    // 3. 대표자명
    @Column(name = "PRESIDENT_NM", length = 20)
    private String presidentNm;

    // 4. 사업자번호
    @Column(name = "BIZ_NO", length = 20)
    private String bizNo;

    // 5. 업종
    @Column(name = "BIZ_COND", length = 20)
    private String bizCond;

    // 6. 업태
    @Column(name = "BIZ_ITEM", length = 50)
    private String bizItem;

    // 7. 주소
    @Column(name = "BIZ_ADDR", length = 200)
    private String bizAddr;

    // 8. 전화번호
    @Column(name = "BIZ_TEL", length = 20)
    private String bizTel;

    // 9. 팩스
    @Column(name = "BIZ_FAX", length = 20)
    private String bizFax;

    // 10. 담당자 코드
    @Column(name = "EMP_CD", length = 20)
    private String empCd;

    // 11. 담당자명
    @Column(name = "EMP_NM", length = 50)
    private String empNm;

    // 12. 담당자 E-MAIL
    @Column(name = "EMP_E_MAIL", length = 30)
    private String empEMail;

    // 13. 담당자 전화번호(직통번호)
    @Column(name = "EMP_TEL", length = 20)
    private String empTel;

    // 14. 담당자 핸드폰번호
    @Column(name = "EMP_HP", length = 20)
    private String empHp;

    // 15. 구분 (01-구매처/02-고객사)
    @Column(name = "BIZ_FLAG", length = 2)
    private String bizFlag;
}
