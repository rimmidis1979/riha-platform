package com.rihasoftwaresolutions.stockai.strategy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_trade_transactions")
public class StockTradeTransactionEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "decision_id", nullable = false)
    private UUID decisionId;

    @Column(name = "workflow_instance_id", nullable = false, length = 128)
    private String workflowInstanceId;

    @Column(name = "ticker", nullable = false, length = 24)
    private String ticker;

    @Column(name = "side", nullable = false, length = 16)
    private String side;

    @Column(name = "execution_mode", nullable = false, length = 48)
    private String executionMode;

    @Column(name = "strategy_name", nullable = false, length = 160)
    private String strategyName;

    @Column(name = "prompt_version", nullable = false, length = 160)
    private String promptVersion;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "order_price", precision = 18, scale = 4, nullable = false)
    private BigDecimal orderPrice;

    @Column(name = "executed_fill_price", precision = 18, scale = 4)
    private BigDecimal executedFillPrice;

    @Column(name = "stop_loss_price", precision = 18, scale = 4)
    private BigDecimal stopLossPrice;

    @Column(name = "predicted_target_price", precision = 18, scale = 4)
    private BigDecimal predictedTargetPrice;

    @Column(name = "realized_profit_loss_usd", precision = 18, scale = 4)
    private BigDecimal realizedProfitLossUsd;

    @Column(name = "realized_profit_loss_pct")
    private Double realizedProfitLossPct;

    @Column(name = "critic_score")
    private Double criticScore;

    @Column(name = "robinhood_order_id", length = 128)
    private String robinhoodOrderId;

    @Column(name = "status", nullable = false, length = 48)
    private String status;

    @Column(name = "raw_event_trace_json", columnDefinition = "TEXT")
    private String rawEventTraceJson;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    public StockTradeTransactionEntity() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public String getWorkflowInstanceId() {
        return workflowInstanceId;
    }

    public void setWorkflowInstanceId(String workflowInstanceId) {
        this.workflowInstanceId = workflowInstanceId;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getSide() {
        return side;
    }

    public void setSide(String side) {
        this.side = side;
    }

    public String getExecutionMode() {
        return executionMode;
    }

    public void setExecutionMode(String executionMode) {
        this.executionMode = executionMode;
    }

    public String getStrategyName() {
        return strategyName;
    }

    public void setStrategyName(String strategyName) {
        this.strategyName = strategyName;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public void setPromptVersion(String promptVersion) {
        this.promptVersion = promptVersion;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getOrderPrice() {
        return orderPrice;
    }

    public void setOrderPrice(BigDecimal orderPrice) {
        this.orderPrice = orderPrice;
    }

    public BigDecimal getExecutedFillPrice() {
        return executedFillPrice;
    }

    public void setExecutedFillPrice(BigDecimal executedFillPrice) {
        this.executedFillPrice = executedFillPrice;
    }

    public BigDecimal getStopLossPrice() {
        return stopLossPrice;
    }

    public void setStopLossPrice(BigDecimal stopLossPrice) {
        this.stopLossPrice = stopLossPrice;
    }

    public BigDecimal getPredictedTargetPrice() {
        return predictedTargetPrice;
    }

    public void setPredictedTargetPrice(BigDecimal predictedTargetPrice) {
        this.predictedTargetPrice = predictedTargetPrice;
    }

    public BigDecimal getRealizedProfitLossUsd() {
        return realizedProfitLossUsd;
    }

    public void setRealizedProfitLossUsd(BigDecimal realizedProfitLossUsd) {
        this.realizedProfitLossUsd = realizedProfitLossUsd;
    }

    public Double getRealizedProfitLossPct() {
        return realizedProfitLossPct;
    }

    public void setRealizedProfitLossPct(Double realizedProfitLossPct) {
        this.realizedProfitLossPct = realizedProfitLossPct;
    }

    public Double getCriticScore() {
        return criticScore;
    }

    public void setCriticScore(Double criticScore) {
        this.criticScore = criticScore;
    }

    public String getRobinhoodOrderId() {
        return robinhoodOrderId;
    }

    public void setRobinhoodOrderId(String robinhoodOrderId) {
        this.robinhoodOrderId = robinhoodOrderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRawEventTraceJson() {
        return rawEventTraceJson;
    }

    public void setRawEventTraceJson(String rawEventTraceJson) {
        this.rawEventTraceJson = rawEventTraceJson;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(Instant executedAt) {
        this.executedAt = executedAt;
    }
}

