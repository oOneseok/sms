package com.example.sms.service;

import com.example.sms.entity.*;
import com.example.sms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class ProdService {

    private final ProdRepository prodRepository;
    private final ProdResultRepository prodResultRepository;

    private final ItemRepository itemRepository; // ItemMst repo
    private final ItemStockRepository itemStockRepository;
    private final ItemStockHisRepository itemStockHisRepository;

    private final ItemIoRepository itemIoRepository;
    private final WhMstRepository whMstRepository;

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private String newProdNo() {
        return "PROD" + LocalDateTime.now().format(TS);
    }

    private String newStkHisCd() {
        return "STK" + LocalDateTime.now().format(TS);
    }

    private String newIoCd() {
        // ItemIo PK 길이 20이라서 짧게
        String v = "IO" + LocalDateTime.now().format(TS);
        return v.length() > 20 ? v.substring(0, 20) : v;
    }

    private void validateProductItem(String itemCd) {
        ItemMst item = itemRepository.findById(itemCd)
                .orElseThrow(() -> new IllegalArgumentException("ITEM not found: " + itemCd));
        if (!"02".equals(item.getItemFlag())) {
            throw new IllegalArgumentException("ITEM_FLAG must be 02(product). itemCd=" + itemCd);
        }
    }

    @Transactional
    public Prod createProd(Prod body) {
        String prodNo = (body.getProdNo() == null || body.getProdNo().isBlank()) ? newProdNo() : body.getProdNo();

        if (body.getItemCd() == null || body.getItemCd().isBlank()) {
            throw new IllegalArgumentException("ITEM_CD is required");
        }
        validateProductItem(body.getItemCd());

        if (prodRepository.existsById(prodNo)) {
            throw new IllegalArgumentException("Already exists: " + prodNo);
        }

        return prodRepository.save(
                Prod.builder()
                        .prodNo(prodNo)
                        .prodDt(body.getProdDt()) // 문자
                        .itemCd(body.getItemCd())
                        .planQty(body.getPlanQty() == null ? BigDecimal.ZERO : body.getPlanQty())
                        .status(body.getStatus() == null || body.getStatus().isBlank() ? "01" : body.getStatus())
                        .remark(body.getRemark())
                        .build()
        );
    }

    @Transactional
    public Prod updateProd(String prodNo, Prod body) {
        Prod old = prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));

        // itemCd 변경 허용 시 검증
        String itemCd = (body.getItemCd() == null || body.getItemCd().isBlank()) ? old.getItemCd() : body.getItemCd();
        validateProductItem(itemCd);

        return prodRepository.save(
                Prod.builder()
                        .prodNo(prodNo)
                        .prodDt(body.getProdDt() == null ? old.getProdDt() : body.getProdDt())
                        .itemCd(itemCd)
                        .planQty(body.getPlanQty() == null ? old.getPlanQty() : body.getPlanQty())
                        .status(body.getStatus() == null ? old.getStatus() : body.getStatus())
                        .remark(body.getRemark() == null ? old.getRemark() : body.getRemark())
                        .build()
        );
    }

    @Transactional
    public Prod cancelProd(String prodNo, String remark) {
        Prod old = prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));

        return prodRepository.save(
                Prod.builder()
                        .prodNo(old.getProdNo())
                        .prodDt(old.getProdDt())
                        .itemCd(old.getItemCd())
                        .planQty(old.getPlanQty())
                        .status("09")
                        .remark(remark == null ? old.getRemark() : remark)
                        .build()
        );
    }

    /**
     * 생산실적 등록 + (선택) 완제품 입고/IO/HIS/재고 반영까지 처리
     * - applyToStockAndIo=true 일 때:
     *   1) TB_ITEMSTOCK (완제품 재고 +GOOD_QTY)
     *   2) TB_ITEMSTOCK_HIS 기록
     *   3) TB_ITEM_IO 기록 (IO_TYPE=PROD_RESULT)
     *   4) PROD 상태를 05로 업데이트
     */
    @Transactional
    public ProdResult createResultAndOptionallyReceive(String prodNo,
                                                       LocalDate resultDt,
                                                       String whCd,
                                                       BigDecimal goodQty,
                                                       BigDecimal badQty,
                                                       String badRes,
                                                       String remark,
                                                       boolean applyToStockAndIo) {

        Prod prod = prodRepository.findById(prodNo)
                .orElseThrow(() -> new IllegalArgumentException("PROD not found: " + prodNo));

        if ("09".equals(prod.getStatus())) {
            throw new IllegalArgumentException("Canceled PROD cannot be processed.");
        }

        // ✅ [추가] 입고 반영이면 창고 필수
        if (applyToStockAndIo) {
            if (whCd == null || whCd.isBlank()) {
                throw new IllegalArgumentException("WH_CD is required when applyToStockAndIo=true");
            }
        }

        // ✅ [추가] 수량 검증 (음수 방지 + 계획수량 초과 방지)
        BigDecimal planQty = prod.getPlanQty() == null ? BigDecimal.ZERO : prod.getPlanQty();
        BigDecimal g = goodQty == null ? BigDecimal.ZERO : goodQty;
        BigDecimal b = badQty == null ? BigDecimal.ZERO : badQty;

        if (g.signum() < 0 || b.signum() < 0) {
            throw new IllegalArgumentException("GOOD_QTY/BAD_QTY must be >= 0");
        }

        // 필요하면 아래를 "!= 0"로 바꿔서 (정상품+불량=계획수량) 강제 가능
        if (g.add(b).compareTo(planQty) > 0) {
            throw new IllegalArgumentException("GOOD_QTY + BAD_QTY cannot exceed PLAN_QTY");
        }

        Integer nextSeq = prodResultRepository.maxSeqByProdNo(prodNo) + 1;

        ProdResult savedResult = prodResultRepository.save(
                ProdResult.builder()
                        .id(new ProdResultId(prodNo, nextSeq))
                        .resultDt(resultDt == null ? LocalDate.now() : resultDt)
                        .whCd(whCd)
                        .goodQty(g)
                        .badQty(b)
                        .badRes(badRes)
                        .remark(remark)
                        .build()
        );

        if (applyToStockAndIo) {
            // 1) 완제품 입고 => TB_ITEMSTOCK 증가
            String itemCd = prod.getItemCd();
            ItemStockId stockId = new ItemStockId(itemCd, whCd);

            ItemStock cur = itemStockRepository.findById(stockId).orElse(
                    ItemStock.builder()
                            .id(stockId)
                            .stockQty(BigDecimal.ZERO)
                            .allocQty(BigDecimal.ZERO)
                            .build()
            );

            BigDecimal add = savedResult.getGoodQty() == null ? BigDecimal.ZERO : savedResult.getGoodQty();
            BigDecimal curStock = cur.getStockQty() == null ? BigDecimal.ZERO : cur.getStockQty();
            BigDecimal curAlloc = cur.getAllocQty() == null ? BigDecimal.ZERO : cur.getAllocQty();

            BigDecimal newStock = curStock.add(add);

            itemStockRepository.save(
                    ItemStock.builder()
                            .id(stockId)
                            .stockQty(newStock)
                            .allocQty(curAlloc)
                            .build()
            );

            // 2) TB_ITEMSTOCK_HIS 기록
            itemStockHisRepository.save(
                    ItemStockHis.builder()
                            .stkHisCd(newStkHisCd())
                            .itemCd(itemCd)
                            .whCd(whCd)
                            .trxDt(LocalDateTime.now())
                            .ioType("PROD_RESULT")
                            .qtyDelta(add)
                            .allocDelta(BigDecimal.ZERO)
                            .refTb("TB_PROD")
                            .refNo(prodNo)
                            .refSeq(savedResult.getId().getSeqNo())
                            .remark("생산완료 입고")
                            .build()
            );

            // 3) TB_ITEM_IO 기록 (ItemIo.qty가 Integer라서 정수만 허용)
            ItemMst item = itemRepository.findById(itemCd)
                    .orElseThrow(() -> new IllegalArgumentException("ITEM not found: " + itemCd));
            WhMst toWh = whMstRepository.findById(whCd)
                    .orElseThrow(() -> new IllegalArgumentException("WH not found: " + whCd));

            if (add.stripTrailingZeros().scale() > 0) {
                throw new IllegalArgumentException("GOOD_QTY must be integer for TB_ITEM_IO.QTY (현재: " + add + ")");
            }

            ItemIo io = new ItemIo();
            io.setIoCd(newIoCd());
            io.setIoDt(LocalDate.now().toString()); // yyyy-MM-dd
            io.setIoType("PROD_RESULT");
            io.setItemMst(item);
            io.setQty(add.intValueExact());
            io.setFromWh(null);
            io.setToWh(toWh);
            io.setRefTb("TB_PROD");
            io.setRefCd(prodNo);
            io.setRefSeq(savedResult.getId().getSeqNo());
            io.setRemark("생산실적 입고");
            itemIoRepository.save(io);

            // 4) PROD 상태 업데이트 (생산완료 05)
            prodRepository.save(
                    Prod.builder()
                            .prodNo(prod.getProdNo())
                            .prodDt(prod.getProdDt())
                            .itemCd(prod.getItemCd())
                            .planQty(prod.getPlanQty())
                            .status("05")
                            .remark(prod.getRemark())
                            .build()
            );
        }

        return savedResult;
    }
}
