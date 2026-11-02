package com.rihasoftwaresolutions.stockai.risk.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record PreTradeRiskCheckRequest(
        @NotBlank String ticker,
        String sector,
        @NotNull @Positive Integer proposedShares,
        @NotNull @Positive BigDecimal limitPrice,
        BigDecimal stopLossPrice
) {
}
