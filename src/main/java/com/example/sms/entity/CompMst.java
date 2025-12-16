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
@Table(name = "TB_COMPMST")
public class CompMst {

    // 1. 사업장 코드 (PK)
    @Id
    @Column(name = "COMP_CD", length = 20)
    private String compCd;

    // 2. 사업장명
    @Column(name = "COMP_NM", length = 50, nullable = false)
    private String compNm;

    // 3. 대표자명
    @Column(name = "REPRESENT_NM", length = 50)
    private String representNm;

    // 4. 사업자 번호
    @Column(name = "BIZ_NO", length = 20)
    private String bizNo;

    // 5. 종목
    @Column(name = "BIZ_TYPE", length = 100)
    private String bizType;

    // 6. 업태
    @Column(name = "BIZ_ITEM", length = 100)
    private String bizItem;

    // 7. 주소
    @Column(name = "ADDR", length = 200)
    private String addr;

    // 8. 전화번호
    @Column(name = "TEL_NO", length = 15)
    private String telNo;

    // 9. 팩스번호
    @Column(name = "FAX_NO", length = 15)
    private String faxNo;

    // 10. 회사 이미지 (로고/도장) 파일 저장하고 링크를 불러와서 읽는 방식
    @Column(name = "COMP_IMG", length = 255)
    private String compImg;
}
