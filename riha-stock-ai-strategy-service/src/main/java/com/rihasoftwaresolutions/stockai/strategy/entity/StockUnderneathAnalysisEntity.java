package com.rihasoftwaresolutions.stockai.strategy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "stock_underneath_analyses")
public class StockUnderneathAnalysisEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "workflow_instance_id", nullable = false, length = 128)
    private String workflowInstanceId;

    @Column(name = "ticker", nullable = false, length = 24)
    private String ticker;

    @Column(name = "trading_date", nullable = false)
    private LocalDate tradingDate;

    @Column(name = "discovery_algorithm", nullable = false, length = 64)
    private String discoveryAlgorithm;

    @Column(name = "strategies_applied_json", columnDefinition = "TEXT", nullable = false)
    private String strategiesAppliedJson;

    @Column(name = "technical_snapshot_json", columnDefinition = "TEXT", nullable = false)
    private String technicalSnapshotJson;

    @Column(name = "sec_catalyst_summary_json", columnDefinition = "TEXT", nullable = false)
    private String secCatalystSummaryJson;

    @Column(name = "episodic_memory_rag_json", columnDefinition = "TEXT", nullable = false)
    private String episodicMemoryRagJson;

    @Column(name = "recommendation", nullable = false, length = 24)
    private String recommendation;

    @Column(name = "current_price_at_eval", precision = 18, scale = 4, nullable = false)
    private BigDecimal currentPriceAtEval;

    @Column(name = "predicted_target_price", precision = 18, scale = 4, nullable = false)
    private BigDecimal predictedTargetPrice;

    @Column(name = "predicted_gain_pct")
    private Double predictedGainPct;

    @Column(name = "predicted_horizon", length = 64)
    private String predictedHorizon;

    @Column(name = "stop_loss_price", precision = 18, scale = 4, nullable = false)
    private BigDecimal stopLossPrice;

    @Column(name = "risk_reward_ratio", nullable = false)
    private Double riskRewardRatio;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore;

    @Column(name = "critic_spel_passed", nullable = false)
    private Boolean criticSpelPassed;

    @Column(name = "critic_semantic_score", nullable = false)
    private Double criticSemanticScore;

    @Column(name = "critic_verdict", nullable = false, length = 64)
    private String criticVerdict;

    @Column(name = "critic_remediation_feedback", columnDefinition = "TEXT")
    private String criticRemediationFeedback;

    @Column(name = "ai_reasoning_chain", columnDefinition = "TEXT")
    private String aiReasoningChain;

    @Column(name = "evaluated_at", nullable = false)
    private Instant evaluatedAt;

    public StockUnderneathAnalysisEntity() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public LocalDate getTradingDate() {
        return tradingDate;
    }

    public void setTradingDate(LocalDate tradingDate) {
        this.tradingDate = tradingDate;
    }

    public String getDiscoveryAlgorithm() {
        return discoveryAlgorithm;
    }

    public void setDiscoveryAlgorithm(String discoveryAlgorithm) {
        this.discoveryAlgorithm = discoveryAlgorithm;
    }

    public String getStrategiesAppliedJson() {
        return strategiesAppliedJson;
    }

    public void setStrategiesAppliedJson(String strategiesAppliedJson) {
        this.strategiesAppliedJson = strategiesAppliedJson;
    }

    public String getTechnicalSnapshotJson() {
        return technicalSnapshotJson;
    }

    public void setTechnicalSnapshotJson(String technicalSnapshotJson) {
        this.technicalSnapshotJson = technicalSnapshotJson;
    }

    public String getSecCatalystSummaryJson() {
        return secCatalystSummaryJson;
    }

    public void setSecCatalystSummaryJson(String secCatalystSummaryJson) {
        this.secCatalystSummaryJson = secCatalystSummaryJson;
    }

    public String getEpisodicMemoryRagJson() {
        return episodicMemoryRagJson;
    }

    public void setEpisodicMemoryRagJson(String episodicMemoryRagJson) {
        this.episodicMemoryRagJson = episodicMemoryRagJson;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public BigDecimal getCurrentPriceAtEval() {
        return currentPriceAtEval;
    }

    public void setCurrentPriceAtEval(BigDecimal currentPriceAtEval) {
        this.currentPriceAtEval = currentPriceAtEval;
    }

    public BigDecimal getPredictedTargetPrice() {
        return predictedTargetPrice;
    }

    public void setPredictedTargetPrice(BigDecimal predictedTargetPrice) {
        this.predictedTargetPrice = predictedTargetPrice;
    }

    public Double getPredictedGainPct() {
        return predictedGainPct;
    }

    public void setPredictedGainPct(Double predictedGainPct) {
        this.predictedGainPct = predictedGainPct;
    }

    public String getPredictedHorizon() {
        return predictedHorizon;
    }

    public void setPredictedHorizon(String predictedHorizon) {
        this.predictedHorizon = predictedHorizon;
    }

    public BigDecimal getStopLossPrice() {
        return stopLossPrice;
    }

    public void setStopLossPrice(BigDecimal stopLossPrice) {
        this.stopLossPrice = stopLossPrice;
    }

    public Double getRiskRewardRatio() {
        return riskRewardRatio;
    }

    public void setRiskRewardRatio(Double riskRewardRatio) {
        this.riskRewardRatio = riskRewardRatio;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Double confidenceScore) {
        this.confidenceScore = confidenceScore;
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

    public String getCriticVerdict() {
        return criticVerdict;
    }

    public void setCriticVerdict(String criticVerdict) {
        this.criticVerdict = criticVerdict;
    }

    public String getCriticRemediationFeedback() {
        return criticRemediationFeedback;
    }

    public void setCriticRemediationFeedback(String criticRemediationFeedback) {
        this.criticRemediationFeedback = criticRemediationFeedback;
    }

    public String getAiReasoningChain() {
        return aiReasoningChain;
    }

    public void setAiReasoningChain(String aiReasoningChain) {
        this.aiReasoningChain = aiReasoningChain;
    }

    public Instant getEvaluatedAt() {
        return evaluatedAt;
    }

    public void setEvaluatedAt(Instant evaluatedAt) {
        this.evaluatedAt = evaluatedAt;
    }
}

