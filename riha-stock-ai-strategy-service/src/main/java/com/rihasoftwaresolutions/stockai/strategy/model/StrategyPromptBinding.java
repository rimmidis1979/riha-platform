package com.rihasoftwaresolutions.stockai.strategy.model;

import java.time.Instant;

public record StrategyPromptBinding(
        String strategyId,
        String strategyName,
        String description,
        String promptName,
        String boundSemanticVersion,
        String lifecycleStatus,
        String goalContractId,
        String topologyId,
        boolean active,
        Instant updatedAt
) {
}

