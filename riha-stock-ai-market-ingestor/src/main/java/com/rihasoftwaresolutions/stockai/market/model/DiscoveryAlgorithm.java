package com.rihasoftwaresolutions.stockai.market.model;

public enum DiscoveryAlgorithm {
    ALL,
    TOP_GAINERS_DAY,
    RVOL_BREAKOUT,
    SHORT_SQUEEZE_MICROCAP,
    VWAP_RECLAIM_MOMENTUM,
    HIGH_CONVICTION_MULTI_FACTOR;

    public static DiscoveryAlgorithm fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            return ALL;
        }
        for (DiscoveryAlgorithm value : values()) {
            if (value.name().equalsIgnoreCase(raw.trim())) {
                return value;
            }
        }
        return ALL;
    }
}

