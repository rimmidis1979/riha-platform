package com.rihasoftwaresolutions.stockai.orchestrator.entity;

import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_ai_monitored_stocks", indexes = {
        @Index(name = "idx_monitor_symbol", columnList = "symbol"),
        @Index(name = "idx_monitor_user_id", columnList = "user_id"),
        @Index(name = "idx_monitor_continuous", columnList = "is_continuous_monitor"),
        @Index(name = "idx_monitor_is_owned", columnList = "is_owned")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_symbol", columnNames = {"user_id", "symbol"})
})
public class StockMonitorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", length = 128, nullable = false)
    private String userId;

    @Column(name = "symbol", length = 32, nullable = false)
    private String symbol;

    @Column(name = "company_name", length = 256)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "broker", length = 32, nullable = false)
    private BrokerType broker = BrokerType.ROBINHOOD;

    @Column(name = "is_owned", nullable = false)
    private boolean isOwned = false;

    @Column(name = "run_strategic_loop", nullable = false)
    private boolean runStrategicLoop = true;

    @Column(name = "is_continuous_monitor", nullable = false)
    private boolean isContinuousMonitor = true;

    @Column(name = "auto_buy_enabled", nullable = false)
    private boolean autoBuyEnabled = false;

    @Column(name = "auto_sell_enabled", nullable = false)
    private boolean autoSellEnabled = false;

    @Column(name = "target_profit_margin_pct", precision = 8, scale = 2)
    private BigDecimal targetProfitMarginPct = new BigDecimal("5.00");

    @Column(name = "stop_loss_margin_pct", precision = 8, scale = 2)
    private BigDecimal stopLossMarginPct = new BigDecimal("3.00");

    @Column(name = "max_buy_quantity", precision = 24, scale = 10)
    private BigDecimal maxBuyQuantity = BigDecimal.ONE;

    @Column(name = "max_buy_budget_usd", precision = 24, scale = 6)
    private BigDecimal maxBuyBudgetUsd = new BigDecimal("100.00");

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", length = 32, nullable = false)
    private ExecutionMode executionMode = ExecutionMode.PAPERLESS;

    @Column(name = "current_price", precision = 24, scale = 6)
    private BigDecimal currentPrice;

    @Column(name = "latest_recommendation", length = 32)
    private String latestRecommendation = "HOLD";

    @Column(name = "strategy_confidence_score")
    private Double strategyConfidenceScore = 0.50;

    @Column(name = "strategy_diagnosis_summary", length = 2048)
    private String strategyDiagnosisSummary;

    @Column(name = "last_evaluated_at")
    private Instant lastEvaluatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public StockMonitorEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public BrokerType getBroker() { return broker; }
    public void setBroker(BrokerType broker) { this.broker = broker; }

    public boolean isRunStrategicLoop() { return runStrategicLoop; }
    public void setRunStrategicLoop(boolean runStrategicLoop) { this.runStrategicLoop = runStrategicLoop; }

    public boolean isOwned() { return isOwned; }
    public void setOwned(boolean owned) { isOwned = owned; }

    public boolean isContinuousMonitor() { return isContinuousMonitor; }
    public void setContinuousMonitor(boolean continuousMonitor) { isContinuousMonitor = continuousMonitor; }

    public boolean isAutoBuyEnabled() { return autoBuyEnabled; }
    public void setAutoBuyEnabled(boolean autoBuyEnabled) { this.autoBuyEnabled = autoBuyEnabled; }

    public boolean isAutoSellEnabled() { return autoSellEnabled; }
    public void setAutoSellEnabled(boolean autoSellEnabled) { this.autoSellEnabled = autoSellEnabled; }

    public BigDecimal getTargetProfitMarginPct() { return targetProfitMarginPct; }
    public void setTargetProfitMarginPct(BigDecimal targetProfitMarginPct) { this.targetProfitMarginPct = targetProfitMarginPct; }

    public BigDecimal getStopLossMarginPct() { return stopLossMarginPct; }
    public void setStopLossMarginPct(BigDecimal stopLossMarginPct) { this.stopLossMarginPct = stopLossMarginPct; }

    public BigDecimal getMaxBuyQuantity() { return maxBuyQuantity; }
    public void setMaxBuyQuantity(BigDecimal maxBuyQuantity) { this.maxBuyQuantity = maxBuyQuantity; }

    public BigDecimal getMaxBuyBudgetUsd() { return maxBuyBudgetUsd; }
    public void setMaxBuyBudgetUsd(BigDecimal maxBuyBudgetUsd) { this.maxBuyBudgetUsd = maxBuyBudgetUsd; }

    public ExecutionMode getExecutionMode() { return executionMode; }
    public void setExecutionMode(ExecutionMode executionMode) { this.executionMode = executionMode; }

    public BigDecimal getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(BigDecimal currentPrice) { this.currentPrice = currentPrice; }

    public String getLatestRecommendation() { return latestRecommendation; }
    public void setLatestRecommendation(String latestRecommendation) { this.latestRecommendation = latestRecommendation; }

    public Double getStrategyConfidenceScore() { return strategyConfidenceScore; }
    public void setStrategyConfidenceScore(Double strategyConfidenceScore) { this.strategyConfidenceScore = strategyConfidenceScore; }

    public String getStrategyDiagnosisSummary() { return strategyDiagnosisSummary; }
    public void setStrategyDiagnosisSummary(String strategyDiagnosisSummary) { this.strategyDiagnosisSummary = strategyDiagnosisSummary; }

    public Instant getLastEvaluatedAt() { return lastEvaluatedAt; }
    public void setLastEvaluatedAt(Instant lastEvaluatedAt) { this.lastEvaluatedAt = lastEvaluatedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (lastEvaluatedAt == null) lastEvaluatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}

