package com.example.sms.service;

import com.example.sms.dto.OrderDetDto;
import com.example.sms.entity.OrderDetIdMst;
import com.example.sms.entity.OrderDetMst;
import com.example.sms.entity.OrderMst;
import com.example.sms.repository.ItemRepository;
import com.example.sms.repository.OrderDetMstRepository;
import com.example.sms.repository.OrderMstRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderDetService {

    private final OrderDetMstRepository repo;
    private final OrderMstRepository orderRepo;
    private final ItemRepository itemRepo;

    /** ✅ 전체/검색 통합 */
    @Transactional(readOnly = true)
    public List<OrderDetMst> search(String orderCd, String itemCd, String status) {
        return repo.search(
                orderCd == null ? "" : orderCd.trim(),
                itemCd == null ? "" : itemCd.trim(),
                status == null ? "" : status.trim()
        );
    }

    @Transactional(readOnly = true)
    public OrderDetMst one(String orderCd, Integer seqNo) {
        return repo.findById(makeId(orderCd, seqNo))
                .orElseThrow(() -> new IllegalArgumentException("데이터 없음"));
    }

    @Transactional
    public OrderDetMst save(OrderDetDto dto) {
        if (dto.getOrderCd() == null || dto.getOrderCd().isBlank())
            throw new IllegalArgumentException("ORDER_CD 필수");
        if (dto.getSeqNo() == null)
            throw new IllegalArgumentException("SEQ_NO 필수");
        if (dto.getOrderQty() == null || dto.getOrderQty() <= 0)
            throw new IllegalArgumentException("ORDER_QTY 필수");

        final String orderCd = dto.getOrderCd().trim();

        // ✅ ITEM_CD 비면 I1로 강제
        String itemCd = (dto.getItemCd() == null || dto.getItemCd().isBlank())
                ? "I1"
                : dto.getItemCd().trim();

        // ✅ 품목 FK 방지: TB_ITEMMST에 없으면 저장 금지
        if (!itemRepo.existsById(itemCd)) {
            throw new IllegalArgumentException("TB_ITEMMST에 없는 품목코드입니다: " + itemCd + " (일단 I1만 사용하세요)");
        }

        // ✅ 부모 주문 없으면 생성(ORA-02291 방지)
        orderRepo.findById(orderCd).orElseGet(() -> {
            OrderMst m = new OrderMst();
            m.setOrderCd(orderCd);
            m.setOrderDt(LocalDate.now()); // TB_ORDER.ORDER_DT NOT NULL 대비
            return orderRepo.save(m);
        });

        OrderDetIdMst id = makeId(orderCd, dto.getSeqNo());

        OrderDetMst e = repo.findById(id).orElseGet(OrderDetMst::new);
        e.setId(id);
        e.setItemCd(itemCd);
        e.setOrderQty(dto.getOrderQty());
        e.setStatus(dto.getStatus() == null || dto.getStatus().isBlank() ? "o1" : dto.getStatus());
        e.setRemark(dto.getRemark());

        return repo.save(e);
    }

    @Transactional
    public void delete(String orderCd, Integer seqNo) {
        repo.deleteById(makeId(orderCd, seqNo));
    }

    private OrderDetIdMst makeId(String orderCd, Integer seqNo) {
        OrderDetIdMst id = new OrderDetIdMst();
        id.setOrderCd(orderCd);
        id.setSeqNo(seqNo);
        return id;
    }
}
