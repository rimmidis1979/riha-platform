package com.rihasoftwaresolutions.stockai.strategy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_trade_audit_trail")
public class AiTradeAuditTrailEntity {

    @Id
    @Column(name = "audit_id", nullable = false, updatable = false)
    private UUID auditId;

    @Column(name = "batch_scan_id", nullable = false, length = 80)
    private String batchScanId;

    @Column(name = "time_window", nullable = false, length = 16)
    private String timeWindow;

    @Column(name = "workflow_instance_id", nullable = false, length = 128)
    private String workflowInstanceId;

    @Column(name = "decision_id", nullable = false)
    private UUID decisionId;

    @Column(name = "ticker", nullable = false, length = 24)
    private String ticker;

    @Column(name = "strategy_applied", nullable = false, length = 160)
    private String strategyApplied;

    @Column(name = "prompt_version", nullable = false, length = 160)
    private String promptVersion;

    @Column(name = "dag_node_timings_ms_json", columnDefinition = "TEXT", nullable = false)
    private String dagNodeTimingsMsJson;

    @Column(name = "technical_snapshot_json", columnDefinition = "TEXT", nullable = false)
    private String technicalSnapshotJson;

    @Column(name = "sec_catalyst_snapshot_json", columnDefinition = "TEXT")
    private String secCatalystSnapshotJson;

    @Column(name = "ai_recommendation", nullable = false, length = 24)
    private String aiRecommendation;

    @Column(name = "limit_price", precision = 18, scale = 4)
    private BigDecimal limitPrice;

    @Column(name = "stop_loss_price", precision = 18, scale = 4)
    private BigDecimal stopLossPrice;

    @Column(name = "take_profit_price", precision = 18, scale = 4)
    private BigDecimal takeProfitPrice;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "ai_reasoning_summary", columnDefinition = "TEXT")
    private String aiReasoningSummary;

    @Column(name = "critic_spel_verdict", nullable = false, length = 64)
    private String criticSpelVerdict;

    @Column(name = "critic_convergence_score", nullable = false)
    private Double criticConvergenceScore;

    @Column(name = "critic_remediation_reason", columnDefinition = "TEXT")
    private String criticRemediationReason;

    @Column(name = "execution_status", nullable = false, length = 64)
    private String executionStatus;

    @Column(name = "robinhood_order_id", length = 128)
    private String robinhoodOrderId;

    @Column(name = "fill_price", precision = 18, scale = 4)
    private BigDecimal fillPrice;

    @Column(name = "realized_unrealized_pnl", precision = 18, scale = 4)
    private BigDecimal realizedUnrealizedPnl;

    @Column(name = "total_tokens_used", nullable = false)
    private Integer totalTokensUsed;

    @Column(name = "estimated_token_cost_usd", precision = 18, scale = 6)
    private BigDecimal estimatedTokenCostUsd;

    @Column(name = "raw_event_lineage_json", columnDefinition = "TEXT")
    private String rawEventLineageJson;

    @Column(name = "audited_at", nullable = false)
    private Instant auditedAt;

    public AiTradeAuditTrailEntity() {
    }

    public UUID getAuditId() {
        return auditId;
    }

    public void setAuditId(UUID auditId) {
        this.auditId = auditId;
    }

    public String getBatchScanId() {
        return batchScanId;
    }

    public void setBatchScanId(String batchScanId) {
        this.batchScanId = batchScanId;
    }

    public String getTimeWindow() {
        return timeWindow;
    }

    public void setTimeWindow(String timeWindow) {
        this.timeWindow = timeWindow;
    }

    public String getWorkflowInstanceId() {
        return workflowInstanceId;
    }

    public void setWorkflowInstanceId(String workflowInstanceId) {
        this.workflowInstanceId = workflowInstanceId;
    }

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getStrategyApplied() {
        return strategyApplied;
    }

    public void setStrategyApplied(String strategyApplied) {
        this.strategyApplied = strategyApplied;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public void setPromptVersion(String promptVersion) {
        this.promptVersion = promptVersion;
    }

    public String getDagNodeTimingsMsJson() {
        return dagNodeTimingsMsJson;
    }

    public void setDagNodeTimingsMsJson(String dagNodeTimingsMsJson) {
        this.dagNodeTimingsMsJson = dagNodeTimingsMsJson;
    }

    public String getTechnicalSnapshotJson() {
        return technicalSnapshotJson;
    }

    public void setTechnicalSnapshotJson(String technicalSnapshotJson) {
        this.technicalSnapshotJson = technicalSnapshotJson;
    }

    public String getSecCatalystSnapshotJson() {
        return secCatalystSnapshotJson;
    }

    public void setSecCatalystSnapshotJson(String secCatalystSnapshotJson) {
        this.secCatalystSnapshotJson = secCatalystSnapshotJson;
    }

    public String getAiRecommendation() {
        return aiRecommendation;
    }

    public void setAiRecommendation(String aiRecommendation) {
        this.aiRecommendation = aiRecommendation;
    }

    public BigDecimal getLimitPrice() {
        return limitPrice;
    }

    public void setLimitPrice(BigDecimal limitPrice) {
        this.limitPrice = limitPrice;
    }

    public BigDecimal getStopLossPrice() {
        return stopLossPrice;
    }

    public void setStopLossPrice(BigDecimal stopLossPrice) {
        this.stopLossPrice = stopLossPrice;
    }

    public BigDecimal getTakeProfitPrice() {
        return takeProfitPrice;
    }

    public void setTakeProfitPrice(BigDecimal takeProfitPrice) {
        this.takeProfitPrice = takeProfitPrice;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getAiReasoningSummary() {
        return aiReasoningSummary;
    }

    public void setAiReasoningSummary(String aiReasoningSummary) {
        this.aiReasoningSummary = aiReasoningSummary;
    }

    public String getCriticSpelVerdict() {
        return criticSpelVerdict;
    }

    public void setCriticSpelVerdict(String criticSpelVerdict) {
        this.criticSpelVerdict = criticSpelVerdict;
    }

    public Double getCriticConvergenceScore() {
        return criticConvergenceScore;
    }

    public void setCriticConvergenceScore(Double criticConvergenceScore) {
        this.criticConvergenceScore = criticConvergenceScore;
    }

    public String getCriticRemediationReason() {
        return criticRemediationReason;
    }

    public void setCriticRemediationReason(String criticRemediationReason) {
        this.criticRemediationReason = criticRemediationReason;
    }

    public String getExecutionStatus() {
        return executionStatus;
    }

    public void setExecutionStatus(String executionStatus) {
        this.executionStatus = executionStatus;
    }

    public String getRobinhoodOrderId() {
        return robinhoodOrderId;
    }

    public void setRobinhoodOrderId(String robinhoodOrderId) {
        this.robinhoodOrderId = robinhoodOrderId;
    }

    public BigDecimal getFillPrice() {
        return fillPrice;
    }

    public void setFillPrice(BigDecimal fillPrice) {
        this.fillPrice = fillPrice;
    }

    public BigDecimal getRealizedUnrealizedPnl() {
        return realizedUnrealizedPnl;
    }

    public void setRealizedUnrealizedPnl(BigDecimal realizedUnrealizedPnl) {
        this.realizedUnrealizedPnl = realizedUnrealizedPnl;
    }

    public Integer getTotalTokensUsed() {
        return totalTokensUsed;
    }

    public void setTotalTokensUsed(Integer totalTokensUsed) {
        this.totalTokensUsed = totalTokensUsed;
    }

    public BigDecimal getEstimatedTokenCostUsd() {
        return estimatedTokenCostUsd;
    }

    public void setEstimatedTokenCostUsd(BigDecimal estimatedTokenCostUsd) {
        this.estimatedTokenCostUsd = estimatedTokenCostUsd;
    }

    public String getRawEventLineageJson() {
        return rawEventLineageJson;
    }

    public void setRawEventLineageJson(String rawEventLineageJson) {
        this.rawEventLineageJson = rawEventLineageJson;
    }

    public Instant getAuditedAt() {
        return auditedAt;
    }

    public void setAuditedAt(Instant auditedAt) {
        this.auditedAt = auditedAt;
    }
}

