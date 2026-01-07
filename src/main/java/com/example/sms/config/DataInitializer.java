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
        // 1. 관리자 계정 (기존 유지: 없으면 생성)
        initAdminUser();

        // 2. 메뉴 데이터 (변경: 싹 지우고 다시 생성)
        initMenus();
    }

    private void initAdminUser() {
        if (!userRepository.existsById("ADMIN")) {
            UserMst admin = UserMst.builder()
                    .userId("ADMIN")
                    .userNm("관리자")
                    .pswd("1234")
                    .build();
            userRepository.save(admin);
            System.out.println("✅ 관리자 계정 확인 완료");
        }
    }

    // === 2. 메뉴 데이터 초기화 (초기화 후 재생성 모드) ===
    private void initMenus() {
        // 🚨 [핵심] 기존 메뉴 데이터를 모두 삭제합니다.
        // 이렇게 해야 이름/아이콘/구조 변경 사항이 깔끔하게 반영됩니다.
        menuRepository.deleteAll();
        System.out.println("🧹 기존 메뉴 데이터 삭제 완료 (초기화)");

        // 1. 대분류 (Root)
        createMenu("M10", "기준정보관리", 1, null, null, "/기준정보관리");
        createMenu("M20", "구매/영업관리", 2, null, null, "/구매영업관리");
        createMenu("M30", "자재관리", 3, null, null, "/자재관리");
        createMenu("M40", "생산관리", 4, null, null, "/생산관리");
        createMenu("M90", "시스템관리", 9, null, null, "/시스템관리");

        // 2. 상세 메뉴 (Children)

        // [M10] 기준정보관리
        createMenu("M1001", "사업장 관리", 1, "📦", "M10", "/기준정보관리/사업장관리");
        createMenu("M1002", "거래처 관리", 2, "📋", "M10", "/기준정보관리/거래처관리");
        createMenu("M1003", "품목 관리", 3, "📝", "M10", "/기준정보관리/품목관리");
        createMenu("M1004", "공정 관리", 4, "⚙️", "M10", "/기준정보관리/공정관리");
        createMenu("M1005", "창고 관리", 5, "🏭", "M10", "/기준정보관리/창고관리");
        createMenu("M1006", "BOM 관리", 6, "📋", "M10", "/기준정보관리/BOM관리");

        // [M20] 구매/영업관리
        createMenu("M2001", "발주 관리", 1, "📄", "M20", "/구매영업관리/발주관리");
        createMenu("M2002", "주문 관리", 2, "📦", "M20", "/구매영업관리/주문관리");

        // [M30] 자재관리
        createMenu("M3001", "입고 관리", 1, "📥", "M30", "/자재관리/입고관리");
        createMenu("M3002", "출고 관리", 2, "📤", "M30", "/자재관리/출고관리");
        createMenu("M3003", "재고 관리", 3, "📋", "M30", "/자재관리/재고관리");
        createMenu("M3004", "입출고 내역", 4, "📊", "M30", "/자재관리/입출고내역");

        // [M40] 생산관리
        createMenu("M4001", "생산 관리", 1, "📊", "M40", "/생산관리/생산관리");

        // [M90] 시스템관리
        createMenu("M9001", "시스템 로그", 1, "📋", "M90", "/시스템관리/시스템로그");

        System.out.println("✅ 최신 메뉴 데이터 생성 완료");
    }

    private void createMenu(String menuId, String menuNm, int seqNo, String icon, String parentId, String url) {
        // 🚨 [변경] existsById 체크 삭제 -> 무조건 새로 저장(덮어쓰기)

        MenuMst parent = null;
        if (parentId != null) {
            // 부모 메뉴는 방금 위에서 생성했으므로 findById로 찾아서 연결
            parent = menuRepository.findById(parentId).orElse(null);
        }

        MenuMst menu = MenuMst.builder()
                .menuId(menuId)
                .menuNm(menuNm)
                .seqNo(seqNo)
                .menuIcon(icon)
                .menuUrl(url)
                .parent(parent)
                .build();

        menuRepository.save(menu);
    }
}