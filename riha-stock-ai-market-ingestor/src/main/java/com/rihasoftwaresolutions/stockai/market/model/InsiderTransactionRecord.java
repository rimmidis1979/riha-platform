package com.rihasoftwaresolutions.stockai.market.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * SEC Form 4 Insider Trading Transaction Record & Net Flow Analysis.
 */
public record InsiderTransactionRecord(
        String ticker,
        String netFlowSentiment,             // "BULLISH_CLUSTER_BUYING", "NEUTRAL_ROUTINE_10B5_1", "BEARISH_HEAVY_INSIDER_SELLING"
        BigDecimal net90DayDollarFlow,       // Net dollar purchases (+) vs sales (-)
        Integer totalPurchases90Day,
        Integer totalSales90Day,
        List<Map<String, Object>> recentForm4Filings,
        Instant evaluatedAt
) {
}
