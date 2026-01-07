package com.example.sms.service;

import com.example.sms.dto.PurchaseDetDto;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseMstRepository purchaseMstRepository;
    private final PurchaseDetMstRepository purchaseDetMstRepository;
    private final ItemRepository itemRepository;
    private final LogService logService;

    // ✅ [확정] 타임스탬프 포맷 (년월일시분초밀리초)
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    // ✅ [확정] 발주번호 생성: P + 타임스탬프 (예: P20250107120000123)
    private String newPurchaseCd() {
        return "P" + LocalDateTime.now().format(TS);
    }

    @Transactional(readOnly = true)
    public List<PurchaseMst> getPurchaseList(String sortDirection) {
        Sort sort = Sort.by("purchaseDt");
        if ("ASC".equalsIgnoreCase(sortDirection)) sort = sort.ascending();
        else sort = sort.descending();
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
     * ✅ 발주 저장
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

        // ✅ ID가 비어있으면 무조건 타임스탬프 ID 생성
        if (!hasCd) {
            purchaseCd = newPurchaseCd();
        } else {
            purchaseCd = purchaseCd.trim();
        }

        // DB에 있으면 수정 처리 (기존 상세 삭제)
        if (purchaseMstRepository.existsById(purchaseCd)) {
            actionType = "수정";
            purchaseDetMstRepository.deleteByIdPurchaseCd(purchaseCd);
        }

        PurchaseMst mst = new PurchaseMst();
        mst.setPurchaseCd(purchaseCd);
        mst.setPurchaseDt(purchaseDt);
        mst.setCustCd(custCd);
        mst.setCustEmp(custEmp);
        mst.setRemark(remark);
        purchaseMstRepository.save(mst);

        List<String> purchasedItemNames = new ArrayList<>();
        int seq = 1;
        for (PurchaseDetMst d : details) {
            String itemCd = d.getItemCd();
            if (itemCd == null || itemCd.isBlank()) throw new IllegalArgumentException("품목코드는 필수입니다.");
            if (d.getPurchaseQty() == null || d.getPurchaseQty() <= 0)
                throw new IllegalArgumentException("발주수량은 1 이상이어야 합니다.");

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

        logService.saveLog("발주 관리", actionType, purchaseCd,
                "거래처: " + (custCd == null ? "-" : custCd), itemLogInfo);

        return purchaseCd;
    }

    @Transactional
    public void changeStatus(String purchaseCd, String status) {
        if (!List.of("p1", "p2", "p3", "p9").contains(status)) {
            throw new IllegalArgumentException("허용되지 않은 상태값: " + status);
        }

        List<PurchaseDetMst> dets = purchaseDetMstRepository.findByIdPurchaseCdOrderByIdSeqNoAsc(purchaseCd);
        if (dets.isEmpty()) throw new EntityNotFoundException("발주 상세가 없습니다: " + purchaseCd);

        for (PurchaseDetMst d : dets) d.setStatus(status);
        purchaseDetMstRepository.saveAll(dets);
    }

    @Transactional(readOnly = true)
    public List<PurchaseDetDto> getPurchaseDetailsDto(String purchaseCd) {
        // 1. DB에서 상세 내역 조회 (여긴 코드만 있음)
        List<PurchaseDetMst> entities = purchaseDetMstRepository.findByIdPurchaseCdOrderByIdSeqNoAsc(purchaseCd);

        // 2. 품목 코드들만 수집 (N+1 문제 방지용)
        List<String> itemIds = entities.stream()
                .map(PurchaseDetMst::getItemCd)
                .distinct()
                .toList();

        // 3. 품목 마스터에서 정보(이름, 규격, 단위) 한꺼번에 조회
        Map<String, ItemMst> itemMap = itemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(ItemMst::getItemCd, item -> item, (a, b) -> a));

        // 4. Entity -> DTO 변환 (여기서 이름을 채워넣음)
        return entities.stream().map(e -> {
            ItemMst item = itemMap.get(e.getItemCd());

            return PurchaseDetDto.builder()
                    .seqNo(e.getId().getSeqNo())
                    .itemCd(e.getItemCd())
                    .itemNm(item != null ? item.getItemNm() : "")
                    .itemSpec(item != null ? item.getItemSpec() : "")
                    .itemUnit(item != null ? item.getItemUnit() : "")
                    .purchaseQty(e.getPurchaseQty())
                    .itemCost(e.getItemCost())
                    .status(e.getStatus())
                    .whCd(e.getWhCd())
                    .remark(e.getRemark())
                    .build();
        }).toList();
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
        purchaseDetMstRepository.save(det);
    }

    @Transactional
    public void updateDetailWarehouse(String purchaseCd, Integer seqNo, String whCd) {
        PurchaseDetIdMst id = new PurchaseDetIdMst();
        id.setPurchaseCd(purchaseCd);
        id.setSeqNo(seqNo);
        PurchaseDetMst det = purchaseDetMstRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("발주 상세 정보를 찾을 수 없습니다."));
        det.setWhCd(whCd);
        purchaseDetMstRepository.save(det);
    }

    @Transactional
    public void deletePurchase(String purchaseCd) {
        if (!purchaseMstRepository.existsById(purchaseCd)) {
            throw new EntityNotFoundException("존재하지 않는 발주번호: " + purchaseCd);
        }
        purchaseDetMstRepository.deleteByIdPurchaseCd(purchaseCd);
        purchaseMstRepository.deleteById(purchaseCd);
        logService.saveLog("발주 관리", "삭제", purchaseCd, "발주 삭제 완료");
    }
}