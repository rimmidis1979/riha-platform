package com.rihasoftwaresolutions.stockai.strategy.model;

import jakarta.validation.constraints.NotBlank;

public record EvaluateTickerRequest(
        @NotBlank String ticker,
        String strategyId,
        String promptVersionOverride
) {
}

