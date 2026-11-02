package com.rihasoftwaresolutions.stockai.strategy.model;

import java.time.Instant;
import java.util.List;

/**
 * Adversarial Red-Team Multi-Agent Debate record capturing Long Momentum Specialist,
 * Bearish Devil's Advocate, and Synthesis Arbiter reasoning.
 */
public record AdversarialDebateRecord(
        String ticker,
        String longSpecialistThesis,
        Double longSpecialistConviction,     // 0.0 to 1.0
        List<String> longKeyCatalysts,
        String bearishDevilsAdvocateThesis,
        Double bearishRiskSeverityScore,     // 0.0 to 1.0
        List<String> bearishVulnerabilities, // e.g. ["Overhead L2 ask wall at $143.50", "RSI extended at 68.2", "Dilution overhang"]
        String arbiterFinalRecommendation,   // "BUY", "SELL", "HOLD"
        Double arbiterConsensusConfidence,   // 0.0 to 1.0
        String arbiterSynthesisRationale,
        Integer atrKellyPositionSize,
        Instant debatedAt
) {
}
