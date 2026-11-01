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
@Table(name = "tracked_watchlist_stocks")
public class TrackedWatchlistStockEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ticker", nullable = false, length = 24)
    private String ticker;

    @Column(name = "trading_date", nullable = false)
    private LocalDate tradingDate;

    @Column(name = "added_source", nullable = false, length = 32)
    private String addedSource;

    @Column(name = "discovery_algorithm", nullable = false, length = 64)
    private String discoveryAlgorithm;

    @Column(name = "active_monitoring", nullable = false)
    private Boolean activeMonitoring;

    @Column(name = "latest_recommendation", nullable = false, length = 32)
    private String latestRecommendation;

    @Column(name = "latest_live_price", precision = 18, scale = 4)
    private BigDecimal latestLivePrice;

    @Column(name = "day_change_pct")
    private Double dayChangePct;

    @Column(name = "relative_volume")
    private Double relativeVolume;

    @Column(name = "float_size")
    private Long floatSize;

    @Column(name = "short_borrow_fee_pct")
    private Double shortBorrowFeePct;

    @Column(name = "strategies_applied_json", columnDefinition = "TEXT")
    private String strategiesAppliedJson;

    @Column(name = "latest_predicted_target", precision = 18, scale = 4)
    private BigDecimal latestPredictedTarget;

    @Column(name = "predicted_gain_pct")
    private Double predictedGainPct;

    @Column(name = "latest_stop_loss_price", precision = 18, scale = 4)
    private BigDecimal latestStopLossPrice;

    @Column(name = "risk_reward_ratio")
    private Double riskRewardRatio;

    @Column(name = "latest_confidence_score")
    private Double latestConfidenceScore;

    @Column(name = "critic_verdict", length = 64)
    private String criticVerdict;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public TrackedWatchlistStockEntity() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getAddedSource() {
        return addedSource;
    }

    public void setAddedSource(String addedSource) {
        this.addedSource = addedSource;
    }

    public String getDiscoveryAlgorithm() {
        return discoveryAlgorithm;
    }

    public void setDiscoveryAlgorithm(String discoveryAlgorithm) {
        this.discoveryAlgorithm = discoveryAlgorithm;
    }

    public Boolean getActiveMonitoring() {
        return activeMonitoring;
    }

    public void setActiveMonitoring(Boolean activeMonitoring) {
        this.activeMonitoring = activeMonitoring;
    }

    public String getLatestRecommendation() {
        return latestRecommendation;
    }

    public void setLatestRecommendation(String latestRecommendation) {
        this.latestRecommendation = latestRecommendation;
    }

    public BigDecimal getLatestLivePrice() {
        return latestLivePrice;
    }

    public void setLatestLivePrice(BigDecimal latestLivePrice) {
        this.latestLivePrice = latestLivePrice;
    }

    public Double getDayChangePct() {
        return dayChangePct;
    }

    public void setDayChangePct(Double dayChangePct) {
        this.dayChangePct = dayChangePct;
    }

    public Double getRelativeVolume() {
        return relativeVolume;
    }

    public void setRelativeVolume(Double relativeVolume) {
        this.relativeVolume = relativeVolume;
    }

    public Long getFloatSize() {
        return floatSize;
    }

    public void setFloatSize(Long floatSize) {
        this.floatSize = floatSize;
    }

    public Double getShortBorrowFeePct() {
        return shortBorrowFeePct;
    }

    public void setShortBorrowFeePct(Double shortBorrowFeePct) {
        this.shortBorrowFeePct = shortBorrowFeePct;
    }

    public String getStrategiesAppliedJson() {
        return strategiesAppliedJson;
    }

    public void setStrategiesAppliedJson(String strategiesAppliedJson) {
        this.strategiesAppliedJson = strategiesAppliedJson;
    }

    public BigDecimal getLatestPredictedTarget() {
        return latestPredictedTarget;
    }

    public void setLatestPredictedTarget(BigDecimal latestPredictedTarget) {
        this.latestPredictedTarget = latestPredictedTarget;
    }

    public Double getPredictedGainPct() {
        return predictedGainPct;
    }

    public void setPredictedGainPct(Double predictedGainPct) {
        this.predictedGainPct = predictedGainPct;
    }

    public BigDecimal getLatestStopLossPrice() {
        return latestStopLossPrice;
    }

    public void setLatestStopLossPrice(BigDecimal latestStopLossPrice) {
        this.latestStopLossPrice = latestStopLossPrice;
    }

    public Double getRiskRewardRatio() {
        return riskRewardRatio;
    }

    public void setRiskRewardRatio(Double riskRewardRatio) {
        this.riskRewardRatio = riskRewardRatio;
    }

    public Double getLatestConfidenceScore() {
        return latestConfidenceScore;
    }

    public void setLatestConfidenceScore(Double latestConfidenceScore) {
        this.latestConfidenceScore = latestConfidenceScore;
    }

    public String getCriticVerdict() {
        return criticVerdict;
    }

    public void setCriticVerdict(String criticVerdict) {
        this.criticVerdict = criticVerdict;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

