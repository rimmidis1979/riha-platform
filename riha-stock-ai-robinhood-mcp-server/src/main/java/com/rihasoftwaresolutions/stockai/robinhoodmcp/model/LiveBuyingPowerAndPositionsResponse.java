package com.rihasoftwaresolutions.stockai.robinhoodmcp.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LiveBuyingPowerAndPositionsResponse(
        String accountNumber,
        BigDecimal liveCashBalance,
        BigDecimal buyingPowerUsd,
        BigDecimal unsettledFundsUsd,
        BigDecimal totalEquityUsd,
        BigDecimal unrealizedPnlUsd,
        BigDecimal realizedPnlUsd,
        BigDecimal currentDailyDrawdownPct,
        BigDecimal todayProfitLossUsd,
        Double todayProfitLossPct,
        BigDecimal allTimeProfitLossUsd,
        Double allTimeProfitLossPct,
        List<EquityPosition> openPositions,
        Instant retrievedAt
) {
    public LiveBuyingPowerAndPositionsResponse(
            String accountNumber,
            BigDecimal liveCashBalance,
            BigDecimal buyingPowerUsd,
            BigDecimal unsettledFundsUsd,
            BigDecimal totalEquityUsd,
            BigDecimal unrealizedPnlUsd,
            BigDecimal realizedPnlUsd,
            BigDecimal currentDailyDrawdownPct,
            List<EquityPosition> openPositions,
            Instant retrievedAt
    ) {
        this(accountNumber, liveCashBalance, buyingPowerUsd, unsettledFundsUsd, totalEquityUsd,
                unrealizedPnlUsd, realizedPnlUsd, currentDailyDrawdownPct,
                realizedPnlUsd != null ? realizedPnlUsd : BigDecimal.ZERO, 0.0,
                realizedPnlUsd != null ? realizedPnlUsd : BigDecimal.ZERO, 0.0,
                openPositions, retrievedAt);
    }

    @JsonProperty("cashBuyingPowerUsd")
    public BigDecimal cashBuyingPowerUsd() {
        return buyingPowerUsd != null ? buyingPowerUsd : liveCashBalance;
    }

    @JsonProperty("unallocatedCashUsd")
    public BigDecimal unallocatedCashUsd() {
        return liveCashBalance != null ? liveCashBalance : buyingPowerUsd;
    }

    @JsonProperty("netAccountEquityUsd")
    public BigDecimal netAccountEquityUsd() {
        return totalEquityUsd != null ? totalEquityUsd : buyingPowerUsd;
    }

    public record EquityPosition(
            String ticker,
            BigDecimal quantity,
            BigDecimal averageCostPrice,
            BigDecimal liveMarketPrice,
            BigDecimal marketValueUsd,
            BigDecimal unrealizedPnlUsd,
            BigDecimal unrealizedPnlPct
    ) {
        public EquityPosition(
                String ticker,
                Integer quantity,
                BigDecimal averageCostPrice,
                BigDecimal liveMarketPrice,
                BigDecimal marketValueUsd,
                BigDecimal unrealizedPnlUsd,
                BigDecimal unrealizedPnlPct
        ) {
            this(ticker, quantity != null ? BigDecimal.valueOf(quantity) : BigDecimal.ZERO,
                    averageCostPrice, liveMarketPrice, marketValueUsd, unrealizedPnlUsd, unrealizedPnlPct);
        }
    }
}
