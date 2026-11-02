package com.rihasoftwaresolutions.stockai.strategy.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Automated Post-Mortem Evaluation record emitted to Kafka upon trade completion.
 */
public record PostMortemTradeEvaluationRecord(
        UUID tradeId,
        UUID decisionId,
        String ticker,
        String side,
        BigDecimal entryPrice,
        BigDecimal exitPrice,
        BigDecimal predictedTargetPrice,
        BigDecimal stopLossPrice,
        Double predictedGainPct,
        Double realizedGainPct,
        BigDecimal executionSlippageBps,
        Long holdDurationSeconds,
        String exitTriggerType,             // "TARGET_PROFIT_HIT", "TRAILING_STOP_LOCK", "STALE_MOMENTUM_TIME_EXIT", "CRITIC_CIRCUIT_BREAKER"
        String postMortemLessonLearned,
        Instant evaluatedAt
) {
}
