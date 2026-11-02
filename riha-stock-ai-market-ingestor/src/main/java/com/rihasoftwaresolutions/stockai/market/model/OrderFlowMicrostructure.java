package com.rihasoftwaresolutions.stockai.market.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * High-frequency Order Flow and Market Microstructure Analytics snapshot.
 */
public record OrderFlowMicrostructure(
        String ticker,
        BigDecimal lastPrice,
        Long cumulativeVolumeDeltaCvd,      // Net buy volume minus net sell volume in shares
        Double orderBookImbalanceRatio,     // Bid depth / (Bid depth + Ask depth), e.g. 0.62 = buyer dominated
        BigDecimal currentSpreadBps,        // Live Bid-Ask spread in basis points
        BigDecimal medianSpreadBps,         // 50th percentile rolling spread bps
        BigDecimal p95SpreadBps,            // 95th percentile spread (liquidity shock threshold)
        Double buyerVolumeAggressionPct,    // % of volume hitting Ask (aggressive market buys)
        Double sellerVolumeAggressionPct,   // % of volume hitting Bid (aggressive market sells)
        List<Map<String, Object>> level2VolumeClusters, // Key liquidity clusters with price, size, side
        Double atr14Period,                 // 14-period Average True Range in dollars
        BigDecimal dollarVolumeTurnover20Day,
        Instant capturedAt
) {
}
