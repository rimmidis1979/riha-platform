package com.rihasoftwaresolutions.stockai.market.model;

import java.math.BigDecimal;
import java.time.Instant;

public record LiveQuoteTechnicalsSnapshot(
        String ticker,
        BigDecimal lastPrice,
        BigDecimal bidPrice,
        BigDecimal askPrice,
        BigDecimal spreadBps,
        BigDecimal vwap,
        Double rsi14,
        Double relativeVolume,
        Double shortBorrowFeeRate,
        Long floatSize,
        Long dayVolume,
        String strategySignalDetected,
        String streamSource,
        Instant capturedAt
) {
}

