package com.rihasoftwaresolutions.stockai.orchestrator.entity;

import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "stock_ai_global_settings")
public class GlobalTradingSettingsEntity {

    @Id
    @Column(name = "user_id", length = 128, nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "global_execution_mode", length = 32, nullable = false)
    private ExecutionMode globalExecutionMode = ExecutionMode.PAPERLESS;

    @Column(name = "auto_trading_enabled", nullable = false)
    private boolean autoTradingEnabled = false;

    @Column(name = "scan_interval_seconds", nullable = false)
    private int scanIntervalSeconds = 15;

    @Column(name = "robinhood_api_key", length = 128)
    private String robinhoodApiKey;

    @Column(name = "robinhood_private_key", length = 256)
    private String robinhoodPrivateKey;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public GlobalTradingSettingsEntity() {}

    public GlobalTradingSettingsEntity(String userId) {
        this.userId = userId;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public ExecutionMode getGlobalExecutionMode() { return globalExecutionMode; }
    public void setGlobalExecutionMode(ExecutionMode globalExecutionMode) { this.globalExecutionMode = globalExecutionMode; }

    public boolean isAutoTradingEnabled() { return autoTradingEnabled; }
    public void setAutoTradingEnabled(boolean autoTradingEnabled) { this.autoTradingEnabled = autoTradingEnabled; }

    public int getScanIntervalSeconds() { return scanIntervalSeconds; }
    public void setScanIntervalSeconds(int scanIntervalSeconds) { this.scanIntervalSeconds = scanIntervalSeconds; }

    public String getRobinhoodApiKey() { return robinhoodApiKey; }
    public void setRobinhoodApiKey(String robinhoodApiKey) { this.robinhoodApiKey = robinhoodApiKey; }

    public String getRobinhoodPrivateKey() { return robinhoodPrivateKey; }
    public void setRobinhoodPrivateKey(String robinhoodPrivateKey) { this.robinhoodPrivateKey = robinhoodPrivateKey; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    @PreUpdate
    public void preSave() {
        updatedAt = Instant.now();
    }
}

