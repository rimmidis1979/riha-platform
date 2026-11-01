package com.rihasoftwaresolutions.stockai.robinhoodmcp.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record LiveBuyingPowerAndPositionsResponse(
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
    public record EquityPosition(
            String ticker,
            Integer quantity,
            BigDecimal averageCostPrice,
            BigDecimal liveMarketPrice,
            BigDecimal marketValueUsd,
            BigDecimal unrealizedPnlUsd,
            BigDecimal unrealizedPnlPct
    ) {
    }
}

