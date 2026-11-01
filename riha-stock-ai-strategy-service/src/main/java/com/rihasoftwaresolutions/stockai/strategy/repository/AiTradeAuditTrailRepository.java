package com.rihasoftwaresolutions.stockai.strategy.repository;

import com.rihasoftwaresolutions.stockai.strategy.entity.AiTradeAuditTrailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiTradeAuditTrailRepository extends JpaRepository<AiTradeAuditTrailEntity, UUID> {
    List<AiTradeAuditTrailEntity> findTop150ByOrderByAuditedAtDesc();
    List<AiTradeAuditTrailEntity> findByTimeWindowOrderByAuditedAtDesc(String timeWindow);
    List<AiTradeAuditTrailEntity> findByBatchScanIdOrderByAuditedAtDesc(String batchScanId);
}

