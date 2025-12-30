package com.example.sms.service;

import com.example.sms.entity.OrderDetIdMst;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.entity.OrderMst;
import com.example.sms.repository.ItemRepository;
import com.example.sms.repository.OrderDetMstRepository;
import com.example.sms.repository.OrderMstRepository;
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
public class OrderService {

    private final OrderMstRepository orderMstRepository;
    private final OrderDetMstRepository orderDetMstRepository;
    private final ItemRepository itemRepository;

    @Transactional(readOnly = true)
    public List<OrderMst> getOrderList() {
        return orderMstRepository.findAllByOrderByOrderDtDesc();
    }

    @Transactional(readOnly = true)
    public OrderMst getOrder(String orderCd) {
        return orderMstRepository.findById(orderCd)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문번호: " + orderCd));
    }

    @Transactional(readOnly = true)
    public List<OrderDetMst> getOrderDetails(String orderCd) {
        // 순번(SeqNo) 기준으로 정렬하여 조회
        return orderDetMstRepository.findByIdOrderCdOrderByIdSeqNoAsc(orderCd);
    }

    // 출고 대기 목록 조회 (확정 o2)
    @Transactional(readOnly = true)
    public List<OrderDetMst> getWaitingForOutboundList() {
        return orderDetMstRepository.findAll().stream()
                .filter(d -> "o2".equals(d.getStatus()))
                .collect(Collectors.toList());
    }

    // ✅ [수정] 상태 변경 (PK인 SeqNo로 정확하게 찾기)
    @Transactional
    public void updateDetailStatus(String orderCd, Integer seqNo, String newStatus) {
        OrderDetIdMst id = new OrderDetIdMst();
        id.setOrderCd(orderCd);
        id.setSeqNo(seqNo); // ✅ ItemCd 대신 SeqNo 사용

        OrderDetMst det = orderDetMstRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("주문 상세 정보를 찾을 수 없습니다."));

        det.setStatus(newStatus);
        orderDetMstRepository.save(det);
    }

    /**
     * 주문 저장
     */
    @Transactional
    public String saveOrder(
            String orderCd,
            LocalDate orderDt,
            String custCd,
            String custEmp,
            String remark,
            List<OrderDetMst> details
    ) {
        if (orderDt == null) throw new IllegalArgumentException("주문일자는 필수입니다.");
        if (details == null || details.isEmpty()) throw new IllegalArgumentException("상세는 최소 1건 이상 필요합니다.");

        boolean hasCd = (orderCd != null && !orderCd.isBlank());

        if (!hasCd) {
            orderCd = generateOrderCd(orderDt);
        } else {
            orderCd = orderCd.trim();
        }

        boolean exists = orderMstRepository.existsById(orderCd);

        // 수정 시 기존 상세 삭제
        if (exists) {
            orderDetMstRepository.deleteByIdOrderCd(orderCd);
        }

        // 헤더 저장
        OrderMst mst = new OrderMst();
        mst.setOrderCd(orderCd);
        mst.setOrderDt(orderDt);
        mst.setCustCd(custCd);
        mst.setCustEmp(custEmp);
        mst.setRemark(remark);
        orderMstRepository.save(mst);

        // 상세 저장
        int seq = 1;
        for (OrderDetMst d : details) {

            // 프론트에서 보낸 itemCd를 바로 사용
            String itemCd = d.getItemCd();

            if (itemCd == null || itemCd.isBlank()) {
                throw new IllegalArgumentException("품목코드는 필수입니다.");
            }

            if (d.getOrderQty() == null || d.getOrderQty() <= 0) {
                throw new IllegalArgumentException("주문수량은 1 이상이어야 합니다.");
            }

            // 품목 존재 체크
            itemRepository.findById(itemCd)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목: " + itemCd));

            OrderDetIdMst id = new OrderDetIdMst();
            id.setOrderCd(orderCd);
            id.setSeqNo(seq++); // 순번 자동 채번

            d.setId(id);
            d.setItemCd(itemCd); // 일반 컬럼에 저장

            if (d.getStatus() == null || d.getStatus().isBlank()) {
                d.setStatus("o1");
            }

            orderDetMstRepository.save(d);
        }

        return orderCd;
    }

    @Transactional
    public void deleteOrder(String orderCd) {
        if (!orderMstRepository.existsById(orderCd)) {
            throw new EntityNotFoundException("존재하지 않는 주문번호: " + orderCd);
        }
        orderDetMstRepository.deleteByIdOrderCd(orderCd);
        orderMstRepository.deleteById(orderCd);
    }

    private String generateOrderCd(LocalDate orderDt) {
        String ymd = orderDt.format(DateTimeFormatter.BASIC_ISO_DATE);
        String prefix = "O" + ymd + "-";

        int max = orderMstRepository.findAll().stream()
                .map(OrderMst::getOrderCd)
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
}