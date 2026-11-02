package com.rihasoftwaresolutions.stockai.backtest.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record BacktestTearsheet(
        UUID backtestId,
        String strategyVersion,
        BigDecimal initialCapital,
        BigDecimal endingCapital,
        Double totalReturnPct,
        Double annualizedSharpeRatio,
        Double sortinoRatio,
        Double profitFactor,
        Double maxDrawdownPct,
        Double winRatePct,
        Integer totalTradesExecuted,
        Integer winningTradesCount,
        Integer losingTradesCount,
        Double averageWinLossRatio,
        Double averageHoldDurationHours,
        List<BacktestTradeRecord> tradeLog,
        Map<String, BigDecimal> equityCurveTimeSeries,
        Instant generatedAt
) {
}
