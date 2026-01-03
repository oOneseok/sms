package com.example.sms.repository;

import com.example.sms.entity.ItemIo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ItemIoRepository extends JpaRepository<ItemIo, String> {
    List<ItemIo> findAllByOrderByIoDtDescIoCdDesc();
    List<ItemIo> findAllByOrderByIoDtDescIoCdAsc();

    // [추가] 근거(Ref)로 조회
    Optional<ItemIo> findByRefTbAndRefCdAndRefSeq(String refTb, String refCd, Integer refSeq);
    List<ItemIo> findByRefTbAndRefCdAndIoType(String refTb, String refCd, String ioType);
    List<ItemIo> findByRefTbAndRefCdOrderByIoDtAsc(String refTb, String refCd);
    // 전체 생산 이력 조회용 (최신순 정렬)
    List<ItemIo> findByRefTbOrderByIoDtDesc(String refTb);
    List<ItemIo> findByRefTbOrderByIoDtAsc(String refTb);


}