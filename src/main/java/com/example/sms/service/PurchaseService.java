package com.example.sms.service;

import com.example.sms.entity.ItemMst;
import com.example.sms.entity.PurchaseDetIdMst;
import com.example.sms.entity.PurchaseDetMst;
import com.example.sms.entity.PurchaseMst;
import com.example.sms.repository.ItemRepository;
import com.example.sms.repository.PurchaseDetMstRepository;
import com.example.sms.repository.PurchaseMstRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime; // ✅ 추가됨
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseMstRepository purchaseMstRepository;
    private final PurchaseDetMstRepository purchaseDetMstRepository;
    private final ItemRepository itemRepository;
    private final LogService logService;

    // ✅ ID 생성을 위한 시간 포맷 (yyyyMMddHHmmssSSS)
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    @Transactional(readOnly = true)
    public List<PurchaseMst> getPurchaseList(String sortDirection) {
        // 정렬 기준 컬럼: purchaseDt (발주일자)
        Sort sort = Sort.by("purchaseDt");

        if ("ASC".equalsIgnoreCase(sortDirection)) {
            sort = sort.ascending(); // 오름차순 (과거 -> 최신)
        } else {
            sort = sort.descending(); // 내림차순 (최신 -> 과거)
        }

        return purchaseMstRepository.findAll(sort);
    }

    @Transactional(readOnly = true)
    public PurchaseMst getPurchase(String purchaseCd) {
        return purchaseMstRepository.findById(purchaseCd)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 발주번호: " + purchaseCd));
    }

    @Transactional(readOnly = true)
    public List<PurchaseDetMst> getPurchaseDetails(String purchaseCd) {
        return purchaseDetMstRepository.findByIdPurchaseCdOrderByIdSeqNoAsc(purchaseCd);
    }

    /**
     * ✅ 발주 저장 (ID 자동 생성 로직 변경됨)
     */
    @Transactional
    public String savePurchase(
            String purchaseCd,
            LocalDate purchaseDt,
            String custCd,
            String custEmp,
            String remark,
            List<PurchaseDetMst> details
    ) {
        if (purchaseDt == null) throw new IllegalArgumentException("발주일자는 필수입니다.");
        if (details == null || details.isEmpty()) throw new IllegalArgumentException("상세는 최소 1건 이상 필요합니다.");

        boolean hasCd = (purchaseCd != null && !purchaseCd.isBlank());
        String actionType = "등록";

        if (!hasCd) {
            // ✅ [수정됨] P + 생성일시(밀리초포함) 로 ID 생성
            // 예: P20231231123000123
            purchaseCd = "P" + LocalDateTime.now().format(TS);
        } else {
            purchaseCd = purchaseCd.trim();
        }

        boolean exists = purchaseMstRepository.existsById(purchaseCd);

        if (exists) {
            actionType = "수정";
            purchaseDetMstRepository.deleteByIdPurchaseCd(purchaseCd);
        }

        // 헤더 저장
        PurchaseMst mst = new PurchaseMst();
        mst.setPurchaseCd(purchaseCd);
        mst.setPurchaseDt(purchaseDt);
        mst.setCustCd(custCd);
        mst.setCustEmp(custEmp);
        mst.setRemark(remark);
        purchaseMstRepository.save(mst);

        // 품목 이름을 수집할 리스트 생성
        List<String> purchasedItemNames = new ArrayList<>();

        // 상세 저장
        int seq = 1;
        for (PurchaseDetMst d : details) {
            String itemCd = d.getItemCd();

            if (itemCd == null || itemCd.isBlank()) throw new IllegalArgumentException("품목코드는 필수입니다.");
            if (d.getPurchaseQty() == null || d.getPurchaseQty() <= 0) throw new IllegalArgumentException("발주수량은 1 이상이어야 합니다.");

            // 품목 정보 조회 및 이름 수집
            ItemMst itemMst = itemRepository.findById(itemCd)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목: " + itemCd));

            purchasedItemNames.add(itemMst.getItemNm());

            PurchaseDetIdMst id = new PurchaseDetIdMst();
            id.setPurchaseCd(purchaseCd);
            id.setSeqNo(seq++);

            d.setId(id);
            if (d.getStatus() == null || d.getStatus().isBlank()) d.setStatus("p1");

            purchaseDetMstRepository.save(d);
        }

        // 로그 메시지 생성
        String itemLogInfo;
        if (purchasedItemNames.isEmpty()) {
            itemLogInfo = "품목 없음";
        } else {
            if (purchasedItemNames.size() > 3) {
                itemLogInfo = "발주품목: " + purchasedItemNames.get(0) + " 외 " + (purchasedItemNames.size() - 1) + "건";
            } else {
                itemLogInfo = "발주품목: " + String.join(", ", purchasedItemNames);
            }
        }

        // 로그 저장
        logService.saveLog("발주 관리", actionType, purchaseCd,
                "거래처: " + (custCd == null ? "-" : custCd),
                itemLogInfo);

        return purchaseCd;
    }

    @Transactional
    public void changeStatus(String purchaseCd, String status) {
        if (!List.of("p1", "p2", "p9").contains(status)) {
            throw new IllegalArgumentException("허용되지 않은 상태값: " + status);
        }

        List<PurchaseDetMst> dets = purchaseDetMstRepository.findByIdPurchaseCdOrderByIdSeqNoAsc(purchaseCd);
        if (dets.isEmpty()) throw new EntityNotFoundException("발주 상세가 없습니다: " + purchaseCd);

        for (PurchaseDetMst d : dets) d.setStatus(status);
        purchaseDetMstRepository.saveAll(dets);
    }

    @Transactional(readOnly = true)
    public List<PurchaseDetMst> getWaitingForInboundList() {
        return purchaseDetMstRepository.findAll().stream()
                .filter(det -> "p2".equals(det.getStatus()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateDetailStatus(String purchaseCd, Integer seqNo, String newStatus) {
        PurchaseDetIdMst id = new PurchaseDetIdMst();
        id.setPurchaseCd(purchaseCd);
        id.setSeqNo(seqNo);

        PurchaseDetMst det = purchaseDetMstRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("발주 상세 정보를 찾을 수 없습니다."));

        det.setStatus(newStatus);
    }

}