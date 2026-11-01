package com.rihasoftwaresolutions.stockai.robinhoodmcp.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TradeOrderExecutionReceipt(
        String brokerageOrderId,
        UUID decisionId,
        String workflowInstanceId,
        String ticker,
        String action,
        String orderType,
        Integer quantity,
        BigDecimal limitPrice,
        BigDecimal averageFillPrice,
        BigDecimal slippageBps,
        String fillStatus,
        boolean criticSignatureVerified,
        Instant executedAt
) {
}

