package com.rihasoftwaresolutions.stockai.robinhoodmcp.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record TradeOrderRequest(
        UUID decisionId,
        String workflowInstanceId,
        @NotBlank String ticker,
        @NotBlank String action,
        String orderType,
        @NotNull @Positive Integer quantity,
        @NotNull @Positive BigDecimal limitPrice,
        BigDecimal stopLossPrice,
        BigDecimal takeProfitPrice,
        @NotBlank String criticApprovalToken
) {
}

