package com.rihasoftwaresolutions.stockai.robinhoodmcp.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * In-memory and Redis-backed state representation of a software-emulated
 * One-Cancels-Other (OCO) Synthetic Bracket Order.
 */
public record SyntheticBracketState(
        UUID bracketId,
        String robinhoodBuyOrderId,
        String ticker,
        Integer filledShares,
        BigDecimal fillPrice,
        BigDecimal targetPrice,
        BigDecimal stopLossPrice,
        BigDecimal trailingOffset,
        String status, // "ACTIVE", "TARGET_TRIGGERED", "STOP_TRIGGERED", "CANCELLED"
        Instant createdAt,
        Instant updatedAt
) {
    public SyntheticBracketState withStatus(String newStatus) {
        return new SyntheticBracketState(
                bracketId, robinhoodBuyOrderId, ticker, filledShares, fillPrice,
                targetPrice, stopLossPrice, trailingOffset, newStatus, createdAt, Instant.now()
        );
    }
}
