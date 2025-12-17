package com.example.sms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "TB_USERMST")
public class UserMst {

    // 아이디
    @Id
    @Column(name = "USER_ID", length = 10)
    private String userId;

    // 이름
    @Column(name = "USER_NM", length = 50, nullable = false)
    private String userNm;

    // 비밀번호
    @Column(name = "PSWD", length = 20, nullable = false)
    private String pswd;
}