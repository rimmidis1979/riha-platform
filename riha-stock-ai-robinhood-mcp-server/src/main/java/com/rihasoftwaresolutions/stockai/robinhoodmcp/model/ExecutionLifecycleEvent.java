package com.rihasoftwaresolutions.stockai.robinhoodmcp.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Real-time Execution Lifecycle Event published to Kafka topic riha.stockai.execution.events.
 */
public record ExecutionLifecycleEvent(
        String eventId,
        String eventType, // "ORDER_SUBMITTED", "ORDER_FILLED", "ORDER_CANCELLED", "BRACKET_STOP_TRIGGERED", "BRACKET_TARGET_REACHED"
        UUID decisionId,
        String workflowInstanceId,
        String brokerageOrderId,
        String ticker,
        String side,
        String orderType,
        Integer quantity,
        BigDecimal limitPrice,
        BigDecimal fillPrice,
        BigDecimal slippageBps,
        BigDecimal commissionUsd,
        String exchangeStatus,
        Instant timestamp
) {
}
