package com.rihasoftwaresolutions.stockai.market.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Macroeconomic and Market Regime Sensory Record capturing broad-market breadth,
 * VIX curve term structure, rate benchmarks, and upcoming central bank/economic countdowns.
 */
public record MarketRegimeSnapshot(
        String regimeClassification,        // e.g. "BULLISH_MOMENTUM_EXPANSION", "RISK_OFF_CONTRACTION", "HIGH_VOLATILITY_COMPRESSION"
        Double riskOnSentimentScore,        // 0.0 (Extreme Fear/Risk-Off) to 1.0 (Extreme Greed/Risk-On)
        BigDecimal sp500Price,
        String sp500TrendRegime,            // "ABOVE_20_50_200_SMA", "BELOW_50_ABOVE_200", etc.
        BigDecimal nasdaq100Price,
        String nasdaqTrendRegime,
        BigDecimal currentVix,
        String vixTermStructure,            // "CONTANGO" (Normal/Bullish), "BACKWARDATION" (Stress/Bearish)
        BigDecimal treasuryYield10Year,     // e.g. 4.28%
        BigDecimal usDollarIndexDxy,        // e.g. 104.15
        Map<String, String> economicCalendarCountdowns, // "FOMC_DECISION": "4d 18h", "CPI_RELEASE": "11d", "NFP_EMPLOYMENT": "1d 2h"
        List<String> activeRegimeCatalysts,
        Instant evaluatedAt
) {
}
