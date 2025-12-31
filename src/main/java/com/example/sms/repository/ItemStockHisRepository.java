package com.example.sms.repository;

import com.example.sms.entity.ItemStockHis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface ItemStockHisRepository extends JpaRepository<ItemStockHis, String> {

    // 1. 단순 목록 조회 (기존)
    List<ItemStockHis> findByItemCdOrderByTrxDtDesc(String itemCd);
    List<ItemStockHis> findByWhCdOrderByTrxDtDesc(String whCd);

    // 2. ✅ [추가] 복합 검색 (컨트롤러의 search 메소드 대응)
    @Query("SELECT h FROM ItemStockHis h " +
            "WHERE (:itemCd IS NULL OR h.itemCd = :itemCd) " +
            "AND (:whCd IS NULL OR h.whCd = :whCd) " +
            "AND (:fromDt IS NULL OR h.trxDt >= :fromDt) " +
            "AND (:toDt IS NULL OR h.trxDt <= :toDt) " +
            "ORDER BY h.trxDt DESC")
    Page<ItemStockHis> search(@Param("itemCd") String itemCd,
                              @Param("whCd") String whCd,
                              @Param("fromDt") LocalDateTime fromDt,
                              @Param("toDt") LocalDateTime toDt,
                              Pageable pageable);

    @Query(value = """
        SELECT 
            h.stk_his_cd  AS stkHisCd, 
            h.trx_dt      AS trxDt, 
            h.io_type     AS ioType, 
            h.item_cd     AS itemCd, 
            h.wh_cd       AS whCd, 
            h.qty_delta   AS qty, 
            h.cust_cd     AS custCd, 
            h.remark      AS remark,
            /* ✅ 1. 잔고 계산은 '과거 -> 현재(ASC)' 순서로 차곡차곡 더합니다 */
            SUM(h.qty_delta) OVER (
                PARTITION BY h.item_cd 
                ORDER BY h.trx_dt ASC, h.stk_his_cd ASC
            ) AS balance
        FROM tb_itemstock_his h
        WHERE (:itemCd IS NULL OR h.item_cd = :itemCd)
          AND (:whCd IS NULL OR h.wh_cd = :whCd)
          AND (:fromDt IS NULL OR h.trx_dt >= :fromDt)
          AND (:toDt IS NULL OR h.trx_dt <= :toDt)
        
        /* ✅ 2. 하지만 화면에 보여줄 때는 '최신(DESC)' 순서로 정렬합니다 */
        ORDER BY h.trx_dt DESC, h.stk_his_cd DESC
        """,
            countQuery = "...", // countQuery는 기존 유지
            nativeQuery = true)
    Page<HistoryWithBalanceProjection> findHistoryWithBalance(
            @Param("itemCd") String itemCd,
            @Param("whCd") String whCd,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    // Native Query 결과를 받아줄 인터페이스 (Projection)
    interface HistoryWithBalanceProjection {
        String getStkHisCd();
        LocalDateTime getTrxDt();
        String getIoType();
        String getItemCd();
        String getWhCd();
        BigDecimal getQty();
        BigDecimal getBalance(); // ✅ 계산된 잔고
        String getCustCd();
        String getRemark();
    }
}