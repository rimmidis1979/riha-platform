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

    @Column(name = "robinhood_api_key", length = 2048)
    private String robinhoodApiKey;

    @Column(name = "robinhood_private_key", length = 256)
    private String robinhoodPrivateKey;

    @Column(name = "robinhood_connected")
    private boolean robinhoodConnected = false;

    @Column(name = "robinhood_username", length = 128)
    private String robinhoodUsername;

    @Column(name = "robinhood_account_number", length = 64)
    private String robinhoodAccountNumber;

    @Column(name = "robinhood_device_token", length = 64)
    private String robinhoodDeviceToken;

    @Column(name = "robinhood_refresh_token", length = 2048)
    private String robinhoodRefreshToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "robinhood_execution_mode", length = 32)
    private ExecutionMode robinhoodExecutionMode = ExecutionMode.ACTUAL;

    @Column(name = "schwab_client_id", length = 128)
    private String schwabClientId;

    @Column(name = "schwab_client_secret", length = 128)
    private String schwabClientSecret;

    @Column(name = "schwab_access_token", length = 2048)
    private String schwabAccessToken;

    @Column(name = "schwab_refresh_token", length = 2048)
    private String schwabRefreshToken;

    @Column(name = "schwab_token_expires_at")
    private Instant schwabTokenExpiresAt;

    @Column(name = "schwab_connected")
    private boolean schwabConnected = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "schwab_execution_mode", length = 32)
    private ExecutionMode schwabExecutionMode = ExecutionMode.PAPERLESS;

    @Column(name = "schwab_account_hash", length = 128)
    private String schwabAccountHash;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public GlobalTradingSettingsEntity() {
    }

    public GlobalTradingSettingsEntity(String userId) {
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public ExecutionMode getGlobalExecutionMode() {
        return globalExecutionMode;
    }

    public void setGlobalExecutionMode(ExecutionMode globalExecutionMode) {
        this.globalExecutionMode = globalExecutionMode;
    }

    public boolean isAutoTradingEnabled() {
        return autoTradingEnabled;
    }

    public void setAutoTradingEnabled(boolean autoTradingEnabled) {
        this.autoTradingEnabled = autoTradingEnabled;
    }

    public int getScanIntervalSeconds() {
        return scanIntervalSeconds;
    }

    public void setScanIntervalSeconds(int scanIntervalSeconds) {
        this.scanIntervalSeconds = scanIntervalSeconds;
    }

    public String getRobinhoodApiKey() {
        return robinhoodApiKey;
    }

    public void setRobinhoodApiKey(String robinhoodApiKey) {
        this.robinhoodApiKey = robinhoodApiKey;
    }

    public String getRobinhoodPrivateKey() {
        return robinhoodPrivateKey;
    }

    public void setRobinhoodPrivateKey(String robinhoodPrivateKey) {
        this.robinhoodPrivateKey = robinhoodPrivateKey;
    }

    public boolean isRobinhoodConnected() {
        return robinhoodConnected;
    }

    public void setRobinhoodConnected(boolean robinhoodConnected) {
        this.robinhoodConnected = robinhoodConnected;
    }

    public String getRobinhoodUsername() {
        return robinhoodUsername;
    }

    public void setRobinhoodUsername(String robinhoodUsername) {
        this.robinhoodUsername = robinhoodUsername;
    }

    public String getRobinhoodAccountNumber() {
        return robinhoodAccountNumber;
    }

    public void setRobinhoodAccountNumber(String robinhoodAccountNumber) {
        this.robinhoodAccountNumber = robinhoodAccountNumber;
    }

    public String getRobinhoodDeviceToken() {
        return robinhoodDeviceToken;
    }

    public void setRobinhoodDeviceToken(String robinhoodDeviceToken) {
        this.robinhoodDeviceToken = robinhoodDeviceToken;
    }

    public String getRobinhoodRefreshToken() {
        return robinhoodRefreshToken;
    }

    public void setRobinhoodRefreshToken(String robinhoodRefreshToken) {
        this.robinhoodRefreshToken = robinhoodRefreshToken;
    }

    public ExecutionMode getRobinhoodExecutionMode() {
        return robinhoodExecutionMode;
    }

    public void setRobinhoodExecutionMode(ExecutionMode robinhoodExecutionMode) {
        this.robinhoodExecutionMode = robinhoodExecutionMode;
    }

    public String getSchwabClientId() {
        return schwabClientId;
    }

    public void setSchwabClientId(String schwabClientId) {
        this.schwabClientId = schwabClientId;
    }

    public String getSchwabClientSecret() {
        return schwabClientSecret;
    }

    public void setSchwabClientSecret(String schwabClientSecret) {
        this.schwabClientSecret = schwabClientSecret;
    }

    public String getSchwabAccessToken() {
        return schwabAccessToken;
    }

    public void setSchwabAccessToken(String schwabAccessToken) {
        this.schwabAccessToken = schwabAccessToken;
    }

    public String getSchwabRefreshToken() {
        return schwabRefreshToken;
    }

    public void setSchwabRefreshToken(String schwabRefreshToken) {
        this.schwabRefreshToken = schwabRefreshToken;
    }

    public Instant getSchwabTokenExpiresAt() {
        return schwabTokenExpiresAt;
    }

    public void setSchwabTokenExpiresAt(Instant schwabTokenExpiresAt) {
        this.schwabTokenExpiresAt = schwabTokenExpiresAt;
    }

    public boolean isSchwabConnected() {
        return schwabConnected;
    }

    public void setSchwabConnected(boolean schwabConnected) {
        this.schwabConnected = schwabConnected;
    }

    public ExecutionMode getSchwabExecutionMode() {
        return schwabExecutionMode;
    }

    public void setSchwabExecutionMode(ExecutionMode schwabExecutionMode) {
        this.schwabExecutionMode = schwabExecutionMode;
    }

    public String getSchwabAccountHash() {
        return schwabAccountHash;
    }

    public void setSchwabAccountHash(String schwabAccountHash) {
        this.schwabAccountHash = schwabAccountHash;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @PrePersist
    @PreUpdate
    public void preSave() {
        updatedAt = Instant.now();
    }
}
