package com.rihasoftwaresolutions.stockai.risk.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public record PortfolioRiskSnapshot(
        BigDecimal totalPortfolioEquity,
        BigDecimal settledCash,
        BigDecimal portfolioBeta,
        BigDecimal var95OneDayUsd,
        BigDecimal cvar95ExpectedShortfallUsd,
        BigDecimal maxDrawdownPct,
        Map<String, BigDecimal> sectorExposurePercentages,
        Map<String, Double> crossCorrelationWarnings,
        String circuitBreakerState, // "NORMAL_OPERATION", "TIER_1_DEFENSIVE", "TIER_2_HALTED"
        Instant timestamp
) {
}
