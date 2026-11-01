package com.rihasoftwaresolutions.stockai.strategy.repository;

import com.rihasoftwaresolutions.stockai.strategy.entity.TrackedWatchlistStockEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrackedWatchlistStockRepository extends JpaRepository<TrackedWatchlistStockEntity, UUID> {
    List<TrackedWatchlistStockEntity> findByTradingDateAndActiveMonitoringTrueOrderByUpdatedAtDesc(LocalDate tradingDate);
    List<TrackedWatchlistStockEntity> findByActiveMonitoringTrueOrderByUpdatedAtDesc();
    Optional<TrackedWatchlistStockEntity> findFirstByTickerAndTradingDateOrderByUpdatedAtDesc(String ticker, LocalDate tradingDate);
    Optional<TrackedWatchlistStockEntity> findFirstByTickerOrderByUpdatedAtDesc(String ticker);
}

