package com.rihasoftwaresolutions.stockai.backtest.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BacktestTradeRecord(
        UUID tradeId,
        String ticker,
        String side,
        Instant entryTime,
        Instant exitTime,
        BigDecimal entryPrice,
        BigDecimal exitPrice,
        Integer shares,
        BigDecimal realizedPnlUsd,
        Double realizedPnlPct,
        BigDecimal slippageBps,
        String exitReason // "TAKE_PROFIT_LIMIT", "TRAILING_STOP_LOCK", "STALE_MOMENTUM_TIME_EXIT"
) {
}

