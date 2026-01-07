package com.example.sms.service;

import com.example.sms.dto.OrderDetDto;
import com.example.sms.dto.OrderDto;
import com.example.sms.entity.CustMst;
import com.example.sms.entity.ItemMst;
import com.example.sms.entity.OrderDetIdMst;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.entity.OrderMst;
import com.example.sms.repository.CustRepository;
import com.example.sms.repository.ItemRepository;
import com.example.sms.repository.OrderDetMstRepository;
import com.example.sms.repository.OrderMstRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderMstRepository orderMstRepository;
    private final OrderDetMstRepository orderDetMstRepository;
    private final ItemRepository itemRepository;
    private final CustRepository custRepository;
    private final LogService logService;

    // ✅ [확정] 타임스탬프 포맷 (년월일시분초밀리초)
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    // ✅ [확정] 주문번호 생성: O + 타임스탬프 (예: O20250107120000123)
    private String newOrderCd() {
        return "O" + LocalDateTime.now().format(TS);
    }

    /* =========================================================
     * ✅ DTO 조회 메서드들
     * ========================================================= */
    @Transactional(readOnly = true)
    public List<OrderDto> getOrderListDto(String sort) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sort) ? Sort.Direction.ASC : Sort.Direction.DESC;
        List<OrderMst> list = orderMstRepository.findAll(Sort.by(dir, "orderDt"));

        List<String> custCdList = list.stream()
                .map(OrderMst::getCustCd)
                .filter(cd -> cd != null && !cd.isBlank())
                .distinct()
                .toList();

        Map<String, String> custNmMap = custRepository.findAllById(custCdList).stream()
                .collect(Collectors.toMap(CustMst::getCustCd, CustMst::getCustNm, (a, b) -> a));

        return list.stream().map(o -> {
            OrderDto dto = new OrderDto();
            dto.setOrderCd(o.getOrderCd());
            dto.setOrderDt(o.getOrderDt());
            dto.setCustCd(o.getCustCd());
            dto.setCustNm(custNmMap.getOrDefault(o.getCustCd(), ""));
            dto.setCustEmp(o.getCustEmp());
            dto.setRemark(o.getRemark());
            return dto;
        }).toList();
    }

    @Transactional(readOnly = true)
    public OrderDto getOrderDto(String orderCd) {
        OrderMst o = orderMstRepository.findById(orderCd)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 주문번호: " + orderCd));

        String custNm = "";
        if (o.getCustCd() != null && !o.getCustCd().isBlank()) {
            custNm = custRepository.findById(o.getCustCd())
                    .map(CustMst::getCustNm)
                    .orElse("");
        }

        OrderDto dto = new OrderDto();
        dto.setOrderCd(o.getOrderCd());
        dto.setOrderDt(o.getOrderDt());
        dto.setCustCd(o.getCustCd());
        dto.setCustNm(custNm);
        dto.setCustEmp(o.getCustEmp());
        dto.setRemark(o.getRemark());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<OrderDetDto> getOrderDetailsDto(String orderCd) {
        List<OrderDetMst> dets = orderDetMstRepository.findByIdOrderCdOrderByIdSeqNoAsc(orderCd);
        List<String> itemCdList = dets.stream()
                .map(OrderDetMst::getItemCd)
                .filter(cd -> cd != null && !cd.isBlank())
                .distinct()
                .toList();

        Map<String, String> itemNmMap = itemRepository.findAllById(itemCdList).stream()
                .collect(Collectors.toMap(ItemMst::getItemCd, ItemMst::getItemNm, (a, b) -> a));

        return dets.stream().map(d -> {
            OrderDetDto dto = new OrderDetDto();
            dto.setOrderCd(d.getId().getOrderCd());
            dto.setSeqNo(d.getId().getSeqNo());
            dto.setItemCd(d.getItemCd());
            dto.setItemNm(itemNmMap.getOrDefault(d.getItemCd(), ""));
            dto.setOrderQty(d.getOrderQty());
            dto.setWhCd(d.getWhCd());
            dto.setStatus(d.getStatus());
            dto.setRemark(d.getRemark());
            return dto;
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderMst> getOrderList(String sort) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sort) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return orderMstRepository.findAll(Sort.by(dir, "orderDt"));
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

    @Transactional
    public void updateDetailWarehouse(String orderCd, Integer seqNo, String whCd) {
        OrderDetIdMst id = new OrderDetIdMst();
        id.setOrderCd(orderCd);
        id.setSeqNo(seqNo);
        OrderDetMst det = orderDetMstRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("주문 상세 정보를 찾을 수 없습니다."));
        det.setWhCd(whCd);
        orderDetMstRepository.save(det);
    }

    /**
     * ✅ 주문 저장
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
            orderCd = newOrderCd(); // 신규 생성
        } else {
            orderCd = orderCd.trim();
        }

        // 기존 내역 삭제 후 재생성 (수정 시)
        if (orderMstRepository.existsById(orderCd)) {
            actionType = "수정";
            orderDetMstRepository.deleteByIdOrderCd(orderCd);
        }

        OrderMst mst = new OrderMst();
        mst.setOrderCd(orderCd);
        mst.setOrderDt(orderDt);
        mst.setCustCd(custCd);
        mst.setCustEmp(custEmp);
        mst.setRemark(remark);
        orderMstRepository.save(mst);

        List<String> orderedItemNames = new ArrayList<>();
        int seq = 1;

        for (OrderDetMst d : details) {
            // [로그] 들어온 상태값 확인
            System.out.println(">>> [주문저장] 품목: " + d.getItemCd() + ", 수량: " + d.getOrderQty() + ", 넘어온 상태값(Status): " + d.getStatus());

            String itemCd = d.getItemCd();
            if (itemCd == null || itemCd.isBlank()) throw new IllegalArgumentException("품목코드는 필수입니다.");
            if (d.getOrderQty() == null || d.getOrderQty() <= 0) throw new IllegalArgumentException("주문수량은 1 이상이어야 합니다.");

            // 품목명 조회 (로그용)
            ItemMst itemMst = itemRepository.findById(itemCd).orElse(null);
            if (itemMst != null) orderedItemNames.add(itemMst.getItemNm());

            OrderDetIdMst id = new OrderDetIdMst();
            id.setOrderCd(orderCd);
            id.setSeqNo(seq++);
            d.setId(id);
            d.setItemCd(itemCd);

            // ✅ [수정] 상태값이 비어있을 때만 'o1'으로 설정 (o2가 들어오면 o2 유지)
            if (d.getStatus() == null || d.getStatus().isBlank()) {
                d.setStatus("o1");
                System.out.println("   -> 상태값 없음. 'o1' (등록)으로 강제 설정됨.");
            } else {
                System.out.println("   -> 상태값 유지됨: " + d.getStatus());
            }

            orderDetMstRepository.save(d);
        }

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

        logService.saveLog("주문 관리", actionType, orderCd,
                "거래처: " + (custCd == null ? "-" : custCd), itemLogInfo);

        return orderCd;
    }

    @Transactional
    public void deleteOrder(String orderCd) {
        if (!orderMstRepository.existsById(orderCd)) {
            throw new EntityNotFoundException("존재하지 않는 주문번호: " + orderCd);
        }
        orderDetMstRepository.deleteByIdOrderCd(orderCd);
        orderMstRepository.deleteById(orderCd);
        logService.saveLog("주문 관리", "삭제", orderCd, "주문 삭제", "삭제된 주문입니다.");
    }
}