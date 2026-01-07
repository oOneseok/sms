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

    // 1. 단순 목록 조회
    List<ItemStockHis> findByItemCdOrderByTrxDtDesc(String itemCd);
    List<ItemStockHis> findByWhCdOrderByTrxDtDesc(String whCd);

    // 2. 복합 검색
    @Query("SELECT h FROM ItemStockHis h " +
            "WHERE (:itemCd IS NULL OR :itemCd = '' OR h.itemCd LIKE CONCAT('%', :itemCd, '%')) " +
            "AND (:whCd IS NULL OR :whCd = '' OR h.whCd LIKE CONCAT('%', :whCd, '%')) " +
            "AND (:fromDt IS NULL OR h.trxDt >= :fromDt) " +
            "AND (:toDt IS NULL OR h.trxDt <= :toDt) " +
            "ORDER BY h.trxDt DESC")
    Page<ItemStockHis> search(@Param("itemCd") String itemCd,
                              @Param("whCd") String whCd,
                              @Param("fromDt") LocalDateTime fromDt,
                              @Param("toDt") LocalDateTime toDt,
                              Pageable pageable);

    // ✅ 3. 수불부 조회 (잔고, 참조번호, 품목명 포함)
    @Query(value = """
        SELECT 
            h.stk_his_cd  AS stkHisCd, 
            h.trx_dt      AS trxDt, 
            h.io_type     AS ioType, 
            h.item_cd     AS itemCd, 
            i.item_nm     AS itemNm,
            h.wh_cd       AS whCd, 
            h.qty_delta   AS qty, 
            h.cust_cd     AS custCd, 
            h.ref_no      AS refNo,     
            h.remark      AS remark,
            /* 잔고 계산 */
            SUM(h.qty_delta) OVER (
                PARTITION BY h.item_cd 
                ORDER BY h.trx_dt ASC, h.stk_his_cd ASC
            ) AS balance
        FROM tb_itemstock_his h
        LEFT JOIN tb_itemmst i ON h.item_cd = i.item_cd
        WHERE (:itemCd IS NULL OR :itemCd = '' OR h.item_cd = :itemCd)
          AND (:whCd IS NULL OR :whCd = '' OR h.wh_cd = :whCd)
          AND (:fromDt IS NULL OR h.trx_dt >= :fromDt)
          AND (:toDt IS NULL OR h.trx_dt <= :toDt)
        """,
            countQuery = """
            SELECT count(*) FROM tb_itemstock_his h
            WHERE (:itemCd IS NULL OR :itemCd = '' OR h.item_cd = :itemCd)
              AND (:whCd IS NULL OR :whCd = '' OR h.wh_cd = :whCd)
              AND (:fromDt IS NULL OR h.trx_dt >= :fromDt)
              AND (:toDt IS NULL OR h.trx_dt <= :toDt)
            """,
            nativeQuery = true)
    Page<HistoryWithBalanceProjection> findHistoryWithBalance(
            @Param("itemCd") String itemCd,
            @Param("whCd") String whCd,
            @Param("fromDt") LocalDateTime fromDt,
            @Param("toDt") LocalDateTime toDt,
            Pageable pageable
    );

    // ✅ Projection 인터페이스 수정
    interface HistoryWithBalanceProjection {
        String getStkHisCd();
        LocalDateTime getTrxDt();
        String getIoType();
        String getItemCd();
        String getItemNm();
        String getWhCd();
        BigDecimal getQty();
        BigDecimal getBalance();
        String getCustCd();
        String getRefNo();
        String getRemark();
    }
}