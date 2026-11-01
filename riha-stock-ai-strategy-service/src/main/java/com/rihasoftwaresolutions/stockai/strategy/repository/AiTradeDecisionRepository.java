package com.rihasoftwaresolutions.stockai.strategy.repository;

import com.rihasoftwaresolutions.stockai.strategy.entity.AiTradeDecisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiTradeDecisionRepository extends JpaRepository<AiTradeDecisionEntity, UUID> {

    List<AiTradeDecisionEntity> findTop100ByOrderByDecidedAtDesc();

    List<AiTradeDecisionEntity> findByTickerOrderByDecidedAtDesc(String ticker);

    Optional<AiTradeDecisionEntity> findByWorkflowInstanceId(String workflowInstanceId);
}

