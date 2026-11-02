package com.rihasoftwaresolutions.stockai.backtest.model;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BacktestRunConfig(
        String strategyVersion,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotEmpty List<String> tickers,
        BigDecimal initialCapital,
        String slippageModel // "SQUARE_ROOT_IMPACT", "FIXED_BPS", "ZERO_SLIPPAGE_BENCHMARK"
) {
}

