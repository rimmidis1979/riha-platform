package com.rihasoftwaresolutions.stockai.sentiment.model;

import java.time.Instant;

public record ScoredCatalystRecord(
        String catalystId,
        String ticker,
        String headline,
        String source,
        String sentimentLabel, // "POSITIVE", "NEGATIVE", "NEUTRAL"
        Double polarityScore,  // -1.0 to +1.0
        Double confidence,
        String catalystCategory, // "EARNINGS_SURPRISE_BEAT_MISS", "FDA_APPROVAL_OR_REJECTION", "MERGER_ACQUISITION", "MATERIAL_CONTRACT_AWARD"
        String urgencyLevel,     // "CRITICAL", "HIGH", "ROUTINE"
        boolean isImmediateBreakoutCatalyst,
        Instant publishedAt
) {
}
