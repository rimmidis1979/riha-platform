package com.rihasoftwaresolutions.stockai.orchestrator.repository;

import com.rihasoftwaresolutions.stockai.orchestrator.entity.TransactionRecordEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRecordRepository extends JpaRepository<TransactionRecordEntity, UUID> {

    List<TransactionRecordEntity> findByUserIdOrderByExecutedAtDesc(String userId);

    List<TransactionRecordEntity> findByUserIdAndExecutionModeOrderByExecutedAtDesc(String userId, ExecutionMode executionMode);

    List<TransactionRecordEntity> findByUserIdAndOriginOrderByExecutedAtDesc(String userId, PurchaseOrigin origin);

    List<TransactionRecordEntity> findByUserIdAndStatus(String userId, OrderStatus status);

    List<TransactionRecordEntity> findByUserIdAndStatusInOrderByExecutedAtDesc(String userId, List<OrderStatus> statuses);

    List<TransactionRecordEntity> findByUserIdAndSymbolOrderByExecutedAtDesc(String userId, String symbol);

    Optional<TransactionRecordEntity> findByOrderId(String orderId);

    @Query("SELECT t FROM TransactionRecordEntity t WHERE t.userId = :userId AND t.executedAt >= :since ORDER BY t.executedAt DESC")
    List<TransactionRecordEntity> findByUserIdAndExecutedAfter(@Param("userId") String userId, @Param("since") Instant since);

    @Query("SELECT t FROM TransactionRecordEntity t WHERE t.userId = :userId AND t.executionMode = :mode AND t.executedAt >= :since ORDER BY t.executedAt DESC")
    List<TransactionRecordEntity> findByUserIdAndModeAndExecutedAfter(
            @Param("userId") String userId,
            @Param("mode") ExecutionMode mode,
            @Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(t.realizedPnlUsd), 0) FROM TransactionRecordEntity t WHERE t.userId = :userId AND t.executionMode = :mode AND t.executedAt >= :since")
    BigDecimal sumRealizedPnlByUserIdAndModeSince(
            @Param("userId") String userId,
            @Param("mode") ExecutionMode mode,
            @Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(t.unrealizedPnlUsd), 0) FROM TransactionRecordEntity t WHERE t.userId = :userId AND t.executionMode = :mode AND t.status = 'FILLED'")
    BigDecimal sumUnrealizedPnlByUserIdAndMode(
            @Param("userId") String userId,
            @Param("mode") ExecutionMode mode);
}

