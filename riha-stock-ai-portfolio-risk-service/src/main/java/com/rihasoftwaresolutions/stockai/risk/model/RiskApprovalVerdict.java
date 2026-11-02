package com.rihasoftwaresolutions.stockai.risk.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RiskApprovalVerdict(
        boolean approved,
        Integer adjustedMaxShares,
        List<String> rejectionReasons,
        BigDecimal prospectivePortfolioVaR95,
        BigDecimal currentDrawdownPct,
        String circuitBreakerStatus,
        Instant evaluatedAt
) {
}
