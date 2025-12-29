package com.example.sms.service;

import com.example.sms.entity.PurchaseDetIdMst;
import com.example.sms.entity.PurchaseDetMst;
import com.example.sms.entity.PurchaseMst;
import com.example.sms.repository.PurchaseDetMstRepository;
import com.example.sms.repository.PurchaseMstRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseMstRepository purchaseMstRepository;
    private final PurchaseDetMstRepository purchaseDetMstRepository;

    @Transactional(readOnly = true)
    public List<PurchaseMst> getPurchaseList() {
        return purchaseMstRepository.findAllByOrderByPurchaseDtDesc();
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
     * ✅ 저장 규칙(요구사항 반영)
     * - purchaseCd가 비어있으면: 자동생성 신규
     * - purchaseCd가 있고 DB에 있으면: 수정(기존 상세 삭제 후 재저장)
     * - purchaseCd가 있고 DB에 없으면: 신규(사용자가 입력한 코드로 신규 저장)
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

        if (!hasCd) {
            // ✅ 자동생성 신규
            purchaseCd = generatePurchaseCd(purchaseDt);
        } else {
            purchaseCd = purchaseCd.trim();
        }

        boolean exists = purchaseMstRepository.existsById(purchaseCd);

        // ✅ 수정이면 기존 상세 삭제
        if (exists) {
            purchaseDetMstRepository.deleteByIdPurchaseCd(purchaseCd);
        }

        // ✅ 헤더 저장(신규/수정 공통)
        PurchaseMst mst = new PurchaseMst();
        mst.setPurchaseCd(purchaseCd);
        mst.setPurchaseDt(purchaseDt);
        mst.setCustCd(custCd);
        mst.setCustEmp(custEmp);
        mst.setRemark(remark);
        purchaseMstRepository.save(mst);

        // ✅ 상세 저장(신규/수정 공통) : seq는 항상 1부터 재부여
        int seq = 1;
        for (PurchaseDetMst d : details) {
            if (d.getItemCd() == null || d.getItemCd().isBlank()) {
                throw new IllegalArgumentException("품목코드는 필수입니다.");
            }
            if (d.getPurchaseQty() == null || d.getPurchaseQty() <= 0) {
                throw new IllegalArgumentException("발주수량은 1 이상이어야 합니다.");
            }

            PurchaseDetIdMst id = new PurchaseDetIdMst();
            id.setPurchaseCd(purchaseCd);
            id.setSeqNo(seq++);

            d.setId(id);

            if (d.getStatus() == null || d.getStatus().isBlank()) {
                d.setStatus("p1");
            }

            purchaseDetMstRepository.save(d);
        }

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
        // Repository에 findByStatus 메소드가 없다면, findAll 후 필터링하거나 JPQL 사용
        // 여기서는 간단하게 모든 발주 상세를 가져와서 stream으로 필터링하는 방식 예시 (데이터 많으면 Repository 쿼리로 변경 권장)
        return purchaseDetMstRepository.findAll().stream()
                .filter(det -> "p2".equals(det.getStatus())) // p2: 발주확정
                .collect(Collectors.toList());
    }

    // [추가] 상태 변경 (입고 완료 시 호출)
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
