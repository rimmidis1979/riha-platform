package com.rihasoftwaresolutions.stockai.sentiment.model;

import java.time.Instant;

public record AggregatedSentimentSnapshot(
        String ticker,
        Double meanPolarity24h, // -1.0 (extremely bearish) to +1.0 (extremely bullish)
        Integer totalMentions24h,
        Integer positiveCount24h,
        Integer negativeCount24h,
        Integer neutralCount24h,
        String overallSentimentLabel, // "BULLISH", "NEUTRAL", "BEARISH"
        Double confidenceScore,
        Instant lastUpdated
) {
}

