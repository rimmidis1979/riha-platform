package com.rihasoftwaresolutions.stockai.market.model;

import java.time.Instant;
import java.util.List;

public record SecFilingCatalystRecord(
        String ticker,
        String cik,
        boolean dilutionRiskDetected,
        boolean activeS3OrAtmOffering,
        String catalystSummary,
        List<FilingEntry> recentFilings,
        Instant queriedAt
) {
    public record FilingEntry(
            String accessionNumber,
            String formType,
            String filingDate,
            String description,
            String documentUrl
    ) {
    }
}

