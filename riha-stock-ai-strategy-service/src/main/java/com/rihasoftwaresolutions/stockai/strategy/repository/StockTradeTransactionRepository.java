package com.rihasoftwaresolutions.stockai.strategy.repository;

import com.rihasoftwaresolutions.stockai.strategy.entity.StockTradeTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockTradeTransactionRepository extends JpaRepository<StockTradeTransactionEntity, UUID> {
    List<StockTradeTransactionEntity> findTop150ByOrderByExecutedAtDesc();
    List<StockTradeTransactionEntity> findByTickerOrderByExecutedAtDesc(String ticker);
}

