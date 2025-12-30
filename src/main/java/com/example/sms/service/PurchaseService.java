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
    private final LogService logService; // ✅ 로그 서비스 추가

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
     * 발주 저장 (로그 추가됨)
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

        // ✅ 로그용 액션 타입 ("등록" or "수정")
        String actionType = "등록";

        if (!hasCd) {
            purchaseCd = generatePurchaseCd(purchaseDt);
        } else {
            purchaseCd = purchaseCd.trim();
        }

        boolean exists = purchaseMstRepository.existsById(purchaseCd);

        if (exists) {
            actionType = "수정"; // 이미 존재하면 수정
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

        // 상세 저장
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

        // ✅ 로그 저장 (메뉴명, 행위, ID, 내용/거래처)
        logService.saveLog("발주 관리", actionType, purchaseCd, "거래처: " + (custCd == null ? "-" : custCd));

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
                .filter(det -> "p2".equals(det.getStatus())) // p2: 발주확정
                .collect(Collectors.toList());
    }

    // 상태 변경 (입고 완료 시 호출)
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