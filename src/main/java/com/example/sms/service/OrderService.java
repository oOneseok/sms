package com.example.sms.service;

import com.example.sms.entity.ItemMst;
import com.example.sms.entity.OrderDetIdMst;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.entity.OrderMst;
import com.example.sms.repository.ItemRepository;
import com.example.sms.repository.OrderDetMstRepository;
import com.example.sms.repository.OrderMstRepository;
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
public class OrderService {

    private final OrderMstRepository orderMstRepository;
    private final OrderDetMstRepository orderDetMstRepository;
    private final ItemRepository itemRepository;
    private final LogService logService;

    // ✅ ID 생성을 위한 시간 포맷 (yyyyMMddHHmmssSSS)
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    @Transactional(readOnly = true)
    public List<OrderMst> getOrderList(String sortDirection) {
        // 정렬 기준 컬럼: orderDt (주문일자)
        Sort sort = Sort.by("orderDt");

        if ("ASC".equalsIgnoreCase(sortDirection)) {
            sort = sort.ascending(); // 오름차순 (과거 -> 최신)
        } else {
            sort = sort.descending(); // 내림차순 (최신 -> 과거)
        }

        return orderMstRepository.findAll(sort);
    }

    @Transactional(readOnly = true)
    public OrderMst getOrder(String orderCd) {
        return orderMstRepository.findById(orderCd)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문번호: " + orderCd));
    }

    @Transactional(readOnly = true)
    public List<OrderDetMst> getOrderDetails(String orderCd) {
        return orderDetMstRepository.findByIdOrderCdOrderByIdSeqNoAsc(orderCd);
    }

    @Transactional(readOnly = true)
    public List<OrderDetMst> getWaitingForOutboundList() {
        return orderDetMstRepository.findAll().stream()
                .filter(d -> "o2".equals(d.getStatus()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateDetailStatus(String orderCd, Integer seqNo, String newStatus) {
        OrderDetIdMst id = new OrderDetIdMst();
        id.setOrderCd(orderCd);
        id.setSeqNo(seqNo);

        OrderDetMst det = orderDetMstRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("주문 상세 정보를 찾을 수 없습니다."));

        det.setStatus(newStatus);
        orderDetMstRepository.save(det);
    }

    /**
     * ✅ 주문 저장 (ID 자동 생성 로직 변경됨)
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
        String actionType = "등록";

        if (!hasCd) {
            // ✅ [수정됨] O + 생성일시(밀리초포함) 로 ID 생성
            // 예: O20231231123000123
            orderCd = "O" + LocalDateTime.now().format(TS);
        } else {
            orderCd = orderCd.trim();
        }

        if (orderMstRepository.existsById(orderCd)) {
            actionType = "수정";
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

        // 품목 이름을 수집할 리스트
        List<String> orderedItemNames = new ArrayList<>();

        // 상세 저장
        int seq = 1;
        for (OrderDetMst d : details) {
            String itemCd = d.getItemCd();

            if (itemCd == null || itemCd.isBlank()) throw new IllegalArgumentException("품목코드는 필수입니다.");
            if (d.getOrderQty() == null || d.getOrderQty() <= 0) throw new IllegalArgumentException("주문수량은 1 이상이어야 합니다.");

            // 품목 정보를 조회하여 이름(ItemNm) 가져오기
            ItemMst itemMst = itemRepository.findById(itemCd)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목: " + itemCd));

            // 이름 수집
            orderedItemNames.add(itemMst.getItemNm());

            OrderDetIdMst id = new OrderDetIdMst();
            id.setOrderCd(orderCd);
            id.setSeqNo(seq++);

            d.setId(id);
            d.setItemCd(itemCd);
            if (d.getStatus() == null || d.getStatus().isBlank()) d.setStatus("o1");

            orderDetMstRepository.save(d);
        }

        // 로그 메시지 생성
        String itemLogInfo;
        if (orderedItemNames.isEmpty()) {
            itemLogInfo = "품목 없음";
        } else {
            if (orderedItemNames.size() > 3) {
                itemLogInfo = "주문품목: " + orderedItemNames.get(0) + " 외 " + (orderedItemNames.size() - 1) + "건";
            } else {
                itemLogInfo = "주문품목: " + String.join(", ", orderedItemNames);
            }
        }

        // 로그 저장
        logService.saveLog("주문 관리", actionType, orderCd,
                "거래처: " + (custCd == null ? "-" : custCd),
                itemLogInfo);

        return orderCd;
    }

    @Transactional
    public void deleteOrder(String orderCd) {
        if (!orderMstRepository.existsById(orderCd)) {
            throw new EntityNotFoundException("존재하지 않는 주문번호: " + orderCd);
        }
        orderDetMstRepository.deleteByIdOrderCd(orderCd);
        orderMstRepository.deleteById(orderCd);

        // 삭제 로그
        logService.saveLog("주문 관리", "삭제", orderCd, "주문 삭제", "삭제된 주문입니다.");
    }
}