package com.example.sms.controller;

import com.example.sms.entity.ItemStock;
import com.example.sms.entity.ItemStockId;
import com.example.sms.repository.ItemStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stocks")
public class ItemStockController {

    private final ItemStockRepository itemStockRepository;

    // 목록 + 필터 + 페이징
    // GET /api/stocks?itemCd=ITEM001&whCd=WH001&page=0&size=20
    @GetMapping
    public Page<ItemStock> list(@RequestParam(required = false) String itemCd,
                                @RequestParam(required = false) String whCd,
                                Pageable pageable) {
        return itemStockRepository.search(itemCd, whCd, pageable);
    }

    // 단건 조회 (복합키)
    // GET /api/stocks/{itemCd}/{whCd}
    @GetMapping("/{itemCd}/{whCd}")
    public ItemStock detail(@PathVariable String itemCd,
                            @PathVariable String whCd) {
        ItemStockId id = new ItemStockId(itemCd, whCd);
        return itemStockRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ITEMSTOCK not found: " + itemCd + "/" + whCd));
    }

    // 생성
    // POST /api/stocks
    // ✅ 요청 JSON은 아래 둘 중 아무거나 가능하게 처리함
    // 1) { "id": { "itemCd":"A", "whCd":"B" }, "stockQty": 1, "allocQty": 0 }
    // 2) { "stockQty": 1, "allocQty": 0 }  + 쿼리/경로로 itemCd,whCd 받는 방식은 여기선 안 씀
    @PostMapping
    @Transactional
    public ItemStock create(@RequestBody ItemStock body) {

        if (body.getId() == null) throw new IllegalArgumentException("id is required");
        if (isBlank(body.getId().getItemCd())) throw new IllegalArgumentException("ITEM_CD is required");
        if (isBlank(body.getId().getWhCd())) throw new IllegalArgumentException("WH_CD is required");

        ItemStockId id = new ItemStockId(body.getId().getItemCd(), body.getId().getWhCd());
        if (itemStockRepository.existsById(id)) {
            throw new IllegalArgumentException("Already exists: " + id.getItemCd() + "/" + id.getWhCd());
        }

        BigDecimal stock = body.getStockQty() == null ? BigDecimal.ZERO : body.getStockQty();
        BigDecimal alloc = body.getAllocQty() == null ? BigDecimal.ZERO : body.getAllocQty();

        if (alloc.compareTo(stock) > 0) {
            throw new IllegalArgumentException("ALLOC_QTY cannot be greater than STOCK_QTY");
        }

        ItemStock saved = itemStockRepository.save(
                ItemStock.builder()
                        .id(id)
                        .stockQty(stock)
                        .allocQty(alloc)
                        .build()
        );

        return saved;
    }

    // 수정
    // PUT /api/stocks/{itemCd}/{whCd}
    @PutMapping("/{itemCd}/{whCd}")
    @Transactional
    public ItemStock update(@PathVariable String itemCd,
                            @PathVariable String whCd,
                            @RequestBody ItemStock body) {

        ItemStockId id = new ItemStockId(itemCd, whCd);

        ItemStock old = itemStockRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ITEMSTOCK not found: " + itemCd + "/" + whCd));

        BigDecimal stock = body.getStockQty() == null
                ? (old.getStockQty() == null ? BigDecimal.ZERO : old.getStockQty())
                : body.getStockQty();

        BigDecimal alloc = body.getAllocQty() == null
                ? (old.getAllocQty() == null ? BigDecimal.ZERO : old.getAllocQty())
                : body.getAllocQty();

        if (alloc.compareTo(stock) > 0) {
            throw new IllegalArgumentException("ALLOC_QTY cannot be greater than STOCK_QTY");
        }

        ItemStock saved = itemStockRepository.save(
                ItemStock.builder()
                        .id(id) // ✅ 경로의 키를 신뢰
                        .stockQty(stock)
                        .allocQty(alloc)
                        .build()
        );

        return saved;
    }

    // 삭제
    // DELETE /api/stocks/{itemCd}/{whCd}
    @DeleteMapping("/{itemCd}/{whCd}")
    @Transactional
    public void delete(@PathVariable String itemCd,
                       @PathVariable String whCd) {
        ItemStockId id = new ItemStockId(itemCd, whCd);
        itemStockRepository.deleteById(id);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    // ✅ 품목 기준 합산 목록
// GET /api/stocks/summary
    @GetMapping("/summary")
    public java.util.List<ItemStockRepository.StockSummaryView> summary() {
        return itemStockRepository.summary();
    }

    // ✅ 특정 품목의 창고별 재고 목록
// GET /api/stocks/by-item/{itemCd}
    @GetMapping("/by-item/{itemCd}")
    public java.util.List<ItemStock> byItem(@PathVariable String itemCd) {
        return itemStockRepository.findByIdItemCd(itemCd);
    }

}
