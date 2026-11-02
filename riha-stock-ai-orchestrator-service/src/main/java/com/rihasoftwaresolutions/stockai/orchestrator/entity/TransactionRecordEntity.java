package com.rihasoftwaresolutions.stockai.orchestrator.entity;

import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_ai_transaction_records", indexes = {
        @Index(name = "idx_tx_symbol", columnList = "symbol"),
        @Index(name = "idx_tx_user_id", columnList = "user_id"),
        @Index(name = "idx_tx_origin", columnList = "origin"),
        @Index(name = "idx_tx_mode", columnList = "execution_mode"),
        @Index(name = "idx_tx_status", columnList = "status"),
        @Index(name = "idx_tx_executed_at", columnList = "executed_at")
})
public class TransactionRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", length = 128, nullable = false, unique = true)
    private String orderId;

    @Column(name = "user_id", length = 128, nullable = false)
    private String userId;

    @Column(name = "symbol", length = 32, nullable = false)
    private String symbol;

    @Column(name = "company_name", length = 256)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "side", length = 16, nullable = false)
    private OrderSide side;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", length = 16, nullable = false)
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 24, nullable = false)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", length = 32, nullable = false)
    private PurchaseOrigin origin;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", length = 32, nullable = false)
    private ExecutionMode executionMode;

    @Column(name = "quantity", precision = 24, scale = 10, nullable = false)
    private BigDecimal quantity;

    @Column(name = "execution_price", precision = 24, scale = 6, nullable = false)
    private BigDecimal executionPrice;

    @Column(name = "target_limit_price", precision = 24, scale = 6)
    private BigDecimal targetLimitPrice;

    @Column(name = "total_value_usd", precision = 24, scale = 6, nullable = false)
    private BigDecimal totalValueUsd;

    @Column(name = "current_market_price", precision = 24, scale = 6)
    private BigDecimal currentMarketPrice;

    @Column(name = "unrealized_pnl_usd", precision = 24, scale = 6)
    private BigDecimal unrealizedPnlUsd = BigDecimal.ZERO;

    @Column(name = "realized_pnl_usd", precision = 24, scale = 6)
    private BigDecimal realizedPnlUsd = BigDecimal.ZERO;

    @Column(name = "pnl_percent", precision = 12, scale = 4)
    private BigDecimal pnlPercent = BigDecimal.ZERO;

    @Column(name = "recommendation_label", length = 32)
    private String recommendationLabel = "HOLD";

    @Column(name = "strategy_name", length = 128)
    private String strategyName;

    @Column(name = "strategy_diagnosis", length = 2048)
    private String strategyDiagnosis;

    @Column(name = "notes", length = 1024)
    private String notes;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public TransactionRecordEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public OrderSide getSide() { return side; }
    public void setSide(OrderSide side) { this.side = side; }

    public OrderType getOrderType() { return orderType; }
    public void setOrderType(OrderType orderType) { this.orderType = orderType; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public PurchaseOrigin getOrigin() { return origin; }
    public void setOrigin(PurchaseOrigin origin) { this.origin = origin; }

    public ExecutionMode getExecutionMode() { return executionMode; }
    public void setExecutionMode(ExecutionMode executionMode) { this.executionMode = executionMode; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getExecutionPrice() { return executionPrice; }
    public void setExecutionPrice(BigDecimal executionPrice) { this.executionPrice = executionPrice; }

    public BigDecimal getTargetLimitPrice() { return targetLimitPrice; }
    public void setTargetLimitPrice(BigDecimal targetLimitPrice) { this.targetLimitPrice = targetLimitPrice; }

    public BigDecimal getTotalValueUsd() { return totalValueUsd; }
    public void setTotalValueUsd(BigDecimal totalValueUsd) { this.totalValueUsd = totalValueUsd; }

    public BigDecimal getCurrentMarketPrice() { return currentMarketPrice; }
    public void setCurrentMarketPrice(BigDecimal currentMarketPrice) { this.currentMarketPrice = currentMarketPrice; }

    public BigDecimal getUnrealizedPnlUsd() { return unrealizedPnlUsd; }
    public void setUnrealizedPnlUsd(BigDecimal unrealizedPnlUsd) { this.unrealizedPnlUsd = unrealizedPnlUsd; }

    public BigDecimal getRealizedPnlUsd() { return realizedPnlUsd; }
    public void setRealizedPnlUsd(BigDecimal realizedPnlUsd) { this.realizedPnlUsd = realizedPnlUsd; }

    public BigDecimal getPnlPercent() { return pnlPercent; }
    public void setPnlPercent(BigDecimal pnlPercent) { this.pnlPercent = pnlPercent; }

    public String getRecommendationLabel() { return recommendationLabel; }
    public void setRecommendationLabel(String recommendationLabel) { this.recommendationLabel = recommendationLabel; }

    public String getStrategyName() { return strategyName; }
    public void setStrategyName(String strategyName) { this.strategyName = strategyName; }

    public String getStrategyDiagnosis() { return strategyDiagnosis; }
    public void setStrategyDiagnosis(String strategyDiagnosis) { this.strategyDiagnosis = strategyDiagnosis; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getExecutedAt() { return executedAt; }
    public void setExecutedAt(Instant executedAt) { this.executedAt = executedAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (executedAt == null) executedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}

