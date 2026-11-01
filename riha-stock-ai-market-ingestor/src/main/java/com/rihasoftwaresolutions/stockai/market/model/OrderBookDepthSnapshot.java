package com.rihasoftwaresolutions.stockai.market.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderBookDepthSnapshot(
        String ticker,
        BigDecimal bestBid,
        BigDecimal bestAsk,
        BigDecimal spreadBps,
        Double orderBookImbalanceRatio,
        List<PriceLevel> bids,
        List<PriceLevel> asks,
        String streamSource,
        Instant capturedAt
) {
    public record PriceLevel(BigDecimal price, Long size, String exchange) {
    }
}

