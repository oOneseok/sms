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
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseMstRepository purchaseMstRepository;
    private final PurchaseDetMstRepository purchaseDetMstRepository;
    private final ItemRepository itemRepository;
    private final LogService logService;

    /**
     * ✅ B 방식: sort 파라미터 받는 목록 조회
     * sort: "ASC" | "DESC" (기본 DESC)
     */
    @Transactional(readOnly = true)
    public List<PurchaseMst> getPurchaseList(String sort) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sort)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        // PurchaseMst 필드명은 purchaseDt (엔티티 기준)
        return purchaseMstRepository.findAll(Sort.by(dir, "purchaseDt"));
    }

    /**
     * 기존 무인자도 유지 (다른 곳에서 호출 가능)
     */
    @Transactional(readOnly = true)
    public List<PurchaseMst> getPurchaseList() {
        return getPurchaseList("DESC");
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
     * ✅ 발주 저장 (품목명 로그 기록)
     * ✅ 개선: itemRepository.findById() 반복 호출 -> findAllById()로 일괄 조회(Map) (SQL 없이 성능 개선)
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
            purchaseCd = generatePurchaseCd(purchaseDt);
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

        // ✅ [중요] 품목코드들 일괄 조회해서 Map 생성 (N+1 방지)
        List<String> itemCdList = details.stream()
                .map(PurchaseDetMst::getItemCd)
                .filter(cd -> cd != null && !cd.isBlank())
                .distinct()
                .toList();

        Map<String, ItemMst> itemMap = itemRepository.findAllById(itemCdList).stream()
                .collect(Collectors.toMap(ItemMst::getItemCd, it -> it));

        // ✅ 품목 이름 리스트
        List<String> purchasedItemNames = new ArrayList<>();

        // 상세 저장
        int seq = 1;
        for (PurchaseDetMst d : details) {
            String itemCd = d.getItemCd();

            if (itemCd == null || itemCd.isBlank()) throw new IllegalArgumentException("품목코드는 필수입니다.");
            if (d.getPurchaseQty() == null || d.getPurchaseQty() <= 0) throw new IllegalArgumentException("발주수량은 1 이상이어야 합니다.");

            ItemMst itemMst = itemMap.get(itemCd);
            if (itemMst == null) throw new IllegalArgumentException("존재하지 않는 품목: " + itemCd);

            purchasedItemNames.add(itemMst.getItemNm());

            PurchaseDetIdMst id = new PurchaseDetIdMst();
            id.setPurchaseCd(purchaseCd);
            id.setSeqNo(seq++);

            d.setId(id);
            if (d.getStatus() == null || d.getStatus().isBlank()) d.setStatus("p1");

            purchaseDetMstRepository.save(d);
        }

        // ✅ 로그 메시지 생성
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

        // ✅ 로그 저장
        logService.saveLog(
                "발주 관리",
                actionType,
                purchaseCd,
                "거래처: " + (custCd == null ? "-" : custCd),
                itemLogInfo
        );

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

    private String generatePurchaseCd(LocalDate purchaseDt) {
        String ymd = purchaseDt.format(DateTimeFormatter.BASIC_ISO_DATE);
        String prefix = "P" + ymd + "-";

        int max = purchaseMstRepository.findAll().stream()
                .map(PurchaseMst::getPurchaseCd)
                .filter(cd -> cd != null && cd.startsWith(prefix))
                .map(cd -> cd.substring(prefix.length()))
                .mapToInt(s -> {
                    try { return Integer.parseInt(s); }
                    catch (Exception e) { return 0; }
                })
                .max()
                .orElse(0);

        return prefix + String.format("%03d", max + 1);
    }

    @Transactional(readOnly = true)
    public List<PurchaseDetMst> getWaitingForInboundList() {
        return purchaseDetMstRepository.findAll().stream()
                .filter(det -> "p2".equals(det.getStatus()))
                .collect(Collectors.toList());
    }

    /**
     * ✅ 상태 업데이트 (너 코드에서 save 누락되어 있어서 반영 안 될 수 있음 → 저장 추가)
     */
    @Transactional
    public void updateDetailStatus(String purchaseCd, Integer seqNo, String newStatus) {
        PurchaseDetIdMst id = new PurchaseDetIdMst();
        id.setPurchaseCd(purchaseCd);
        id.setSeqNo(seqNo);

        PurchaseDetMst det = purchaseDetMstRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("발주 상세 정보를 찾을 수 없습니다."));

        det.setStatus(newStatus);
        purchaseDetMstRepository.save(det);
    }
}
