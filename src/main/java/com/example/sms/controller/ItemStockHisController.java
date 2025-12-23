package com.example.sms.controller;

import com.example.sms.entity.ItemStockHis;
import com.example.sms.repository.ItemStockHisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stock_his")
public class ItemStockHisController {

    private final ItemStockHisRepository itemStockHisRepository;

    // 목록 + 필터 + 기간 + 페이징
    // GET /api/stock-his?itemCd=ITEM001&whCd=WH001&fromDt=2025-12-01T00:00:00&toDt=2025-12-31T23:59:59
    @GetMapping
    public Page<ItemStockHis> list(@RequestParam(required = false) String itemCd,
                                   @RequestParam(required = false) String whCd,
                                   @RequestParam(required = false)
                                   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDt,
                                   @RequestParam(required = false)
                                   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDt,
                                   Pageable pageable) {
        return itemStockHisRepository.search(itemCd, whCd, fromDt, toDt, pageable);
    }

    // 단건 조회
    // GET /api/stock-his/{stkHisCd}
    @GetMapping("/{stkHisCd}")
    public ItemStockHis detail(@PathVariable String stkHisCd) {
        return itemStockHisRepository.findById(stkHisCd)
                .orElseThrow(() -> new IllegalArgumentException("STK_HIS_CD not found: " + stkHisCd));
    }

    // 생성(관리/테스트용)
    // POST /api/stock-his
    @PostMapping
    @Transactional
    public ItemStockHis create(@RequestBody ItemStockHis body) {
        if (body.getStkHisCd() == null || body.getStkHisCd().isBlank()) {
            throw new IllegalArgumentException("STK_HIS_CD is required");
        }
        if (itemStockHisRepository.existsById(body.getStkHisCd())) {
            throw new IllegalArgumentException("Already exists: " + body.getStkHisCd());
        }

        // trxDt 없으면 서버에서 now
        LocalDateTime trx = body.getTrxDt() == null ? LocalDateTime.now() : body.getTrxDt();

        ItemStockHis saved = itemStockHisRepository.save(
                ItemStockHis.builder()
                        .stkHisCd(body.getStkHisCd())
                        .itemCd(body.getItemCd())
                        .whCd(body.getWhCd())
                        .trxDt(trx)
                        .custCd(body.getCustCd())
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
        return saved;
    }

    // 삭제
    // DELETE /api/stock-his/{stkHisCd}
    @DeleteMapping("/{stkHisCd}")
    @Transactional
    public void delete(@PathVariable String stkHisCd) {
        itemStockHisRepository.deleteById(stkHisCd);
    }
}
