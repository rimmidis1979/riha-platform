package com.rihasoftwaresolutions.stockai.strategy.repository;

import com.rihasoftwaresolutions.stockai.strategy.entity.StockUnderneathAnalysisEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockUnderneathAnalysisRepository extends JpaRepository<StockUnderneathAnalysisEntity, UUID> {
    Optional<StockUnderneathAnalysisEntity> findFirstByTickerOrderByEvaluatedAtDesc(String ticker);
    List<StockUnderneathAnalysisEntity> findTop50ByOrderByEvaluatedAtDesc();
}

