package com.rihasoftwaresolutions.stockai.orchestrator.repository;

import com.rihasoftwaresolutions.stockai.orchestrator.entity.StockMonitorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockMonitorRepository extends JpaRepository<StockMonitorEntity, UUID> {

    List<StockMonitorEntity> findByUserIdOrderBySymbolAsc(String userId);

    List<StockMonitorEntity> findByUserIdAndIsContinuousMonitorTrue(String userId);

    List<StockMonitorEntity> findByIsContinuousMonitorTrue();

    List<StockMonitorEntity> findByRunStrategicLoopTrueOrIsContinuousMonitorTrue();

    List<StockMonitorEntity> findByUserIdAndBroker(String userId, com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.BrokerType broker);

    List<StockMonitorEntity> findByUserIdAndIsOwnedTrue(String userId);

    Optional<StockMonitorEntity> findByUserIdAndSymbol(String userId, String symbol);

    boolean existsByUserIdAndSymbol(String userId, String symbol);

    void deleteByUserIdAndSymbol(String userId, String symbol);
}

