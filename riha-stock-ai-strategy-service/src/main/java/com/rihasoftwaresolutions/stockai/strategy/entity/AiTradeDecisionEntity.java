package com.rihasoftwaresolutions.stockai.strategy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_trade_decisions")
public class AiTradeDecisionEntity {

    @Id
    @Column(name = "decision_id", nullable = false, updatable = false)
    private UUID decisionId;

    @Column(name = "workflow_instance_id", nullable = false, length = 128)
    private String workflowInstanceId;

    @Column(name = "ticker", nullable = false, length = 24)
    private String ticker;

    @Column(name = "strategy_name", nullable = false, length = 160)
    private String strategyName;

    @Column(name = "prompt_version_used", nullable = false, length = 160)
    private String promptVersionUsed;

    @Column(name = "live_market_snapshot_json", columnDefinition = "TEXT", nullable = false)
    private String liveMarketSnapshotJson;

    @Column(name = "agent_reasoning_json", columnDefinition = "TEXT", nullable = false)
    private String agentReasoningJson;

    @Column(name = "critic_spel_passed", nullable = false)
    private Boolean criticSpelPassed;

    @Column(name = "critic_semantic_score", nullable = false)
    private Double criticSemanticScore;

    @Column(name = "critic_feedback", columnDefinition = "TEXT")
    private String criticFeedback;

    @Column(name = "final_action", nullable = false, length = 48)
    private String finalAction;

    @Column(name = "brokerage_order_id", length = 128)
    private String brokerageOrderId;

    @Column(name = "executed_price", precision = 18, scale = 4)
    private BigDecimal executedPrice;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "realized_pnl", precision = 18, scale = 4)
    private BigDecimal realizedPnl;

    @Column(name = "decided_at", nullable = false)
    private Instant decidedAt;

    public AiTradeDecisionEntity() {
    }

    public AiTradeDecisionEntity(
            UUID decisionId,
            String workflowInstanceId,
            String ticker,
            String strategyName,
            String promptVersionUsed,
            String liveMarketSnapshotJson,
            String agentReasoningJson,
            Boolean criticSpelPassed,
            Double criticSemanticScore,
            String criticFeedback,
            String finalAction,
            String brokerageOrderId,
            BigDecimal executedPrice,
            Integer quantity,
            BigDecimal realizedPnl,
            Instant decidedAt) {
        this.decisionId = decisionId;
        this.workflowInstanceId = workflowInstanceId;
        this.ticker = ticker;
        this.strategyName = strategyName;
        this.promptVersionUsed = promptVersionUsed;
        this.liveMarketSnapshotJson = liveMarketSnapshotJson;
        this.agentReasoningJson = agentReasoningJson;
        this.criticSpelPassed = criticSpelPassed;
        this.criticSemanticScore = criticSemanticScore;
        this.criticFeedback = criticFeedback;
        this.finalAction = finalAction;
        this.brokerageOrderId = brokerageOrderId;
        this.executedPrice = executedPrice;
        this.quantity = quantity;
        this.realizedPnl = realizedPnl;
        this.decidedAt = decidedAt;
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

    public String getStrategyName() {
        return strategyName;
    }

    public void setStrategyName(String strategyName) {
        this.strategyName = strategyName;
    }

    public String getPromptVersionUsed() {
        return promptVersionUsed;
    }

    public void setPromptVersionUsed(String promptVersionUsed) {
        this.promptVersionUsed = promptVersionUsed;
    }

    public String getLiveMarketSnapshotJson() {
        return liveMarketSnapshotJson;
    }

    public void setLiveMarketSnapshotJson(String liveMarketSnapshotJson) {
        this.liveMarketSnapshotJson = liveMarketSnapshotJson;
    }

    public String getAgentReasoningJson() {
        return agentReasoningJson;
    }

    public void setAgentReasoningJson(String agentReasoningJson) {
        this.agentReasoningJson = agentReasoningJson;
    }

    public Boolean getCriticSpelPassed() {
        return criticSpelPassed;
    }

    public void setCriticSpelPassed(Boolean criticSpelPassed) {
        this.criticSpelPassed = criticSpelPassed;
    }

    public Double getCriticSemanticScore() {
        return criticSemanticScore;
    }

    public void setCriticSemanticScore(Double criticSemanticScore) {
        this.criticSemanticScore = criticSemanticScore;
    }

    public String getCriticFeedback() {
        return criticFeedback;
    }

    public void setCriticFeedback(String criticFeedback) {
        this.criticFeedback = criticFeedback;
    }

    public String getFinalAction() {
        return finalAction;
    }

    public void setFinalAction(String finalAction) {
        this.finalAction = finalAction;
    }

    public String getBrokerageOrderId() {
        return brokerageOrderId;
    }

    public void setBrokerageOrderId(String brokerageOrderId) {
        this.brokerageOrderId = brokerageOrderId;
    }

    public BigDecimal getExecutedPrice() {
        return executedPrice;
    }

    public void setExecutedPrice(BigDecimal executedPrice) {
        this.executedPrice = executedPrice;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getRealizedPnl() {
        return realizedPnl;
    }

    public void setRealizedPnl(BigDecimal realizedPnl) {
        this.realizedPnl = realizedPnl;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(Instant decidedAt) {
        this.decidedAt = decidedAt;
    }
}

