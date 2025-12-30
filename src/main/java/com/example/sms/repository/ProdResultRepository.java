package com.example.sms.repository;

import com.example.sms.entity.ProdResult;
import com.example.sms.entity.ProdResultId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProdResultRepository extends JpaRepository<ProdResult, ProdResultId> {

    @Query("""
        select r
        from ProdResult r
        where r.id.prodNo = :prodNo
        order by r.id.seqNo asc
    """)
    List<ProdResult> findByProdNoOrderBySeq(String prodNo);

    @Query("""
        select coalesce(max(r.id.seqNo), 0)
        from ProdResult r
        where r.id.prodNo = :prodNo
    """)
    Integer maxSeqByProdNo(String prodNo);
}
