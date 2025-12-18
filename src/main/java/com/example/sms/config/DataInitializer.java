package com.example.sms.config;

import com.example.sms.entity.MenuMst;
import com.example.sms.entity.UserMst;
import com.example.sms.repository.MenuRepository;
import com.example.sms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MenuRepository menuRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. 관리자 계정 초기화 (없으면 생성)
        initAdminUser();

        // 2. 메뉴 데이터 초기화 (없으면 생성)
        initMenus();
    }

    // === 1. 관리자 계정 생성 로직 ===
    private void initAdminUser() {
        if (!userRepository.existsById("ADMIN")) {
            UserMst admin = UserMst.builder()
                    .userId("ADMIN")
                    .userNm("관리자")
                    .pswd("1234")
                    .build();
            userRepository.save(admin);
            System.out.println("✅ 초기 관리자 계정(ADMIN) 생성 완료");
        }
    }

    // === 2. 메뉴 데이터 생성 로직 ===
    private void initMenus() {
        // [1단계] 부모 메뉴(최상위 탭) 먼저 생성
        createMenu("M10", "기준정보관리", 1, null, null);
        createMenu("M20", "구매/영업관리", 2, null, null);
        createMenu("M30", "자재관리", 3, null, null);
        createMenu("M40", "생산관리", 4, null, null);
        createMenu("M90", "시스템관리", 9, null, null);


        // [2단계] 자식 메뉴 생성 (부모 ID 연결)
        // 기준정보관리 (M10) 하위
        createMenu("M1001", "사업장 관리", 1, "📦", "M10");
        createMenu("M1002", "거래처 관리", 2, "📋", "M10");
        createMenu("M1003", "품목 관리", 3, "📝", "M10");
        createMenu("M1004", "공정 관리", 4, "⚙️", "M10");
        createMenu("M1005", "창고 관리", 5, "🏭", "M10");

        // 구매/영업관리 (M20) 하위
        createMenu("M2001", "발주 관리", 1, "📄", "M20");
        createMenu("M2002", "주문 관리", 2, "📦", "M20");
        createMenu("M2003", "출고 관리", 3, "🚚", "M20");
        createMenu("M2004", "반품 관리", 4, "↩️", "M20");

        // 자재관리 (M30) 하위
        createMenu("M3001", "입고 관리", 1, "📥", "M30");

        // 생산관리 (M40) 하위
        createMenu("M4001", "생산 계획", 1, "📊", "M40");
        createMenu("M4002", "생산 실적 관리", 2, "✅", "M40");

        // 시스템 관리 (M90) 하위
        createMenu("M9001","시스템 로그",1,"📜","M90");
    }

    // 메뉴 생성 헬퍼 메서드
    private void createMenu(String menuId, String menuNm, int seqNo, String icon, String parentId) {
        // 이미 존재하면 건너뜀 (중복 방지)
        if (menuRepository.existsById(menuId)) {
            return;
        }

        // 부모 메뉴 찾기
        MenuMst parent = null;
        if (parentId != null) {
            parent = menuRepository.findById(parentId).orElse(null);
        }

        // 엔티티 빌더 사용 (제공해주신 엔티티 구조에 맞춤)
        MenuMst menu = MenuMst.builder()
                .menuId(menuId)
                .menuNm(menuNm)
                .seqNo(seqNo)
                .menuIcon(icon)
                .parent(parent) // 부모 객체를 직접 넣어줌 (Foreign Key 설정됨)
                .build();

        menuRepository.save(menu);
        System.out.println("✅ 메뉴 DB 등록: " + menuNm + " (" + menuId + ")");
    }
}