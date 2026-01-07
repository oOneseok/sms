package com.example.sms.controller;

import com.example.sms.dto.StockHistoryDto;
import com.example.sms.entity.CustMst;
import com.example.sms.entity.ItemStockHis;
import com.example.sms.repository.CustRepository;
import com.example.sms.repository.ItemStockHisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stock_his")
public class ItemStockHisController {

    private final ItemStockHisRepository itemStockHisRepository;
    private final CustRepository custRepository;

    // 목록 조회 (잔고 포함)
    @GetMapping
    public ResponseEntity<Page<StockHistoryDto>> list(
            @RequestParam(required = false) String itemCd,
            @RequestParam(required = false) String whCd,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDt,
            Pageable pageable
    ) {
        // 1. Repository에서 Projection으로 조회 (Native Query 실행)
        Page<ItemStockHisRepository.HistoryWithBalanceProjection> page =
                itemStockHisRepository.findHistoryWithBalance(itemCd, whCd, fromDt, toDt, pageable);

        // 2. DTO 변환 (거래처명 매핑 포함)
        Page<StockHistoryDto> dtoPage = page.map(h -> {
            String custNm = "";
            if (h.getCustCd() != null && !h.getCustCd().isBlank()) {
                custNm = custRepository.findById(h.getCustCd())
                        .map(CustMst::getCustNm)
                        .orElse("");
            }

            return StockHistoryDto.builder()
                    .stkHisCd(h.getStkHisCd())
                    .ioDt(h.getTrxDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                    .ioType(h.getIoType())
                    .itemCd(h.getItemCd())
                    .whCd(h.getWhCd())
                    .qty(h.getQty())
                    .balance(h.getBalance())
                    .refNo(h.getRefNo())
                    .custCd(h.getCustCd())
                    .custNm(custNm)
                    .refNo(h.getRefNo())
                    .remark(h.getRemark())
                    .build();
        });

        return ResponseEntity.ok(dtoPage);
    }

    //목록조회 잔고 미포함
    @GetMapping("/his")
    public ResponseEntity<Page<StockHistoryDto>> Iolist(
            @RequestParam(required = false) String itemCd,
            @RequestParam(required = false) String whCd,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDt,
            Pageable pageable
    ) {
        // 1. JPQL search 메서드 호출 (Page<ItemStockHis> 반환)
        Page<ItemStockHis> page = itemStockHisRepository.search(itemCd, whCd, fromDt, toDt, pageable);

        // 2. DTO 변환 (엔티티 필드에 직접 접근)
        Page<StockHistoryDto> dtoPage = page.map(h -> {
            String custNm = "";
            if (h.getCustCd() != null && !h.getCustCd().isBlank()) {
                custNm = custRepository.findById(h.getCustCd())
                        .map(CustMst::getCustNm)
                        .orElse("");
            }

            return StockHistoryDto.builder()
                    .stkHisCd(h.getStkHisCd())
                    .ioDt(h.getTrxDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                    .ioType(h.getIoType())
                    .itemCd(h.getItemCd())
                    .whCd(h.getWhCd())
                    .qty(h.getQtyDelta())
                    .balance(java.math.BigDecimal.ZERO)
                    .refNo(h.getRefNo())
                    .custCd(h.getCustCd())
                    .custNm(custNm)
                    .remark(h.getRemark())
                    .build();
        });

        return ResponseEntity.ok(dtoPage);
    }

    // 단건 조회 (필요 시 DTO로 변경 권장, 현재는 엔티티 그대로 반환)
    @GetMapping("/{stkHisCd}")
    public ResponseEntity<ItemStockHis> detail(@PathVariable String stkHisCd) {
        return ResponseEntity.ok(itemStockHisRepository.findById(stkHisCd)
                .orElseThrow(() -> new IllegalArgumentException("이력이 존재하지 않습니다: " + stkHisCd)));
    }

    // 생성 (테스트용)
    @PostMapping
    @Transactional
    public ResponseEntity<ItemStockHis> create(@RequestBody ItemStockHis body) {
        if (body.getStkHisCd() == null || body.getStkHisCd().isBlank()) {
            throw new IllegalArgumentException("STK_HIS_CD is required");
        }

        LocalDateTime trx = body.getTrxDt() == null ? LocalDateTime.now() : body.getTrxDt();

        ItemStockHis saved = itemStockHisRepository.save(
                ItemStockHis.builder()
                        .stkHisCd(body.getStkHisCd())
                        .itemCd(body.getItemCd())
                        .whCd(body.getWhCd())
                        .trxDt(trx)
                        .custCd(body.getCustCd()) // 코드로만 저장
                        .ioCd(body.getIoCd())
                        .ioType(body.getIoType())
                        .qtyDelta(body.getQtyDelta())
                        .allocDelta(body.getAllocDelta())
                        .refTb(body.getRefTb())
                        .refNo(body.getRefNo())
                        .refSeq(body.getRefSeq())
                        .remark(body.getRemark())
                        .build()
        );
        return ResponseEntity.ok(saved);
    }

    // 삭제
    @DeleteMapping("/{stkHisCd}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable String stkHisCd) {
        itemStockHisRepository.deleteById(stkHisCd);
        return ResponseEntity.ok().build();
    }
}