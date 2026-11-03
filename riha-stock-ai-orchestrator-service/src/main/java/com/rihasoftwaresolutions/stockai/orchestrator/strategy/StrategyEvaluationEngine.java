package com.rihasoftwaresolutions.stockai.orchestrator.strategy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.StrategyRecommendation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class StrategyEvaluationEngine {

    private static final Logger log = LoggerFactory.getLogger(StrategyEvaluationEngine.class);

    @Value("${riha.stockai.orchestrator.market-ingestor-url:http://localhost:8091}")
    private String marketIngestorUrl;

    @Value("${riha.stockai.orchestrator.strategy-service-url:http://localhost:8093}")
    private String strategyServiceUrl;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public StrategyEvaluationEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public record StrategyDiagnosisResult(
            String symbol,
            BigDecimal currentPrice,
            StrategyRecommendation recommendation,
            double confidenceScore,
            String primaryReason,
            String detailedNotes,
            List<IndicatorEvaluation> evaluations,
            Instant evaluatedAt
    ) {}

    public record IndicatorEvaluation(
            String indicatorName,
            String signal, // BUY, SELL, NEUTRAL, HOLD
            String description,
            double weight
    ) {}

    /**
     * Evaluates real-time strategies on a stock by querying live technical and market feeds.
     * Aligns with StrategyEngineService diagnostic scoring across RSI, VWAP, EMA, and Volatility.
     */
    public StrategyDiagnosisResult evaluate(
            String symbol,
            BigDecimal currentPrice,
            BigDecimal costBasis,
            BigDecimal targetProfitMarginPct,
            BigDecimal stopLossMarginPct) {

        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return new StrategyDiagnosisResult(
                    symbol,
                    BigDecimal.ZERO,
                    StrategyRecommendation.HOLD,
                    0.50,
                    "Insufficient price data",
                    "Awaiting real-time tick streaming from market ingestor.",
                    List.of(),
                    Instant.now()
            );
        }

        List<IndicatorEvaluation> evals = new ArrayList<>();
        double buyScore = 0.0;
        double sellScore = 0.0;
        double totalWeight = 0.0;

        // 1. Fetch live technical indicators from market ingestor
        double livePrice = currentPrice.doubleValue();
        double vwap = livePrice;
        double rsi14 = 50.0;
        double ema9 = livePrice;
        double ema21 = livePrice;
        double dayChangePct = 0.0;
        double relativeVolume = 1.0;
        String detectedSignal = "";

        try {
            String url = marketIngestorUrl + "/api/v1/market/underneath-technicals/" + symbol.toUpperCase();
            String json = restClient.get()
                    .uri(url)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);

            if (json != null && !json.isBlank()) {
                JsonNode root = objectMapper.readTree(json);
                livePrice = root.path("lastPrice").asDouble(livePrice);
                vwap = root.path("vwap").asDouble(livePrice);
                rsi14 = root.path("rsi14").asDouble(50.0);
                ema9 = root.path("ema9").asDouble(livePrice);
                ema21 = root.path("ema21").asDouble(livePrice);
                dayChangePct = root.path("dayChangePct").asDouble(0.0);
                relativeVolume = root.path("relativeVolume").asDouble(1.0);
                detectedSignal = root.path("strategySignalDetected").asText("");
            }
        } catch (Exception ex) {
            log.debug("Live market ingestor note for {}: {}", symbol, ex.getMessage());
        }

        // 2. Relative Strength Index (RSI-14) Strategy
        if (rsi14 < 30.0 || detectedSignal.contains("OVERSOLD")) {
            evals.add(new IndicatorEvaluation(
                    "Relative Strength Index (RSI-14)",
                    "BUY",
                    "RSI is oversold at " + String.format("%.1f", rsi14) + " (< 30). High probability of mean-reversion bounce and institutional accumulation.",
                    3.0
            ));
            buyScore += 3.0;
            totalWeight += 3.0;
        } else if (rsi14 > 70.0) {
            evals.add(new IndicatorEvaluation(
                    "Relative Strength Index (RSI-14)",
                    "SELL",
                    "RSI is overbought at " + String.format("%.1f", rsi14) + " (> 70). Elevated risk of short-term pullback.",
                    2.0
            ));
            sellScore += 2.0;
            totalWeight += 2.0;
        } else {
            evals.add(new IndicatorEvaluation(
                    "Relative Strength Index (RSI-14)",
                    "HOLD",
                    "RSI is balanced at " + String.format("%.1f", rsi14) + " in normal range (30-70 band).",
                    1.0
            ));
            totalWeight += 1.0;
        }

        // 3. VWAP Reclaim & Momentum Continuation
        if (livePrice >= vwap || detectedSignal.contains("VWAP_RECLAIM")) {
            evals.add(new IndicatorEvaluation(
                    "VWAP Intraday Reclaim & Momentum",
                    "BUY",
                    "Price ($" + String.format("%.2f", livePrice) + ") trades at or above session VWAP ($" + String.format("%.2f", vwap) + "), confirming institutional buyer control.",
                    2.5
            ));
            buyScore += 2.5;
            totalWeight += 2.5;
        } else {
            evals.add(new IndicatorEvaluation(
                    "VWAP Intraday Reclaim & Momentum",
                    "HOLD",
                    "Price ($" + String.format("%.2f", livePrice) + ") is below session VWAP ($" + String.format("%.2f", vwap) + "); awaiting buyer reclaim confirmation.",
                    1.5
            ));
            totalWeight += 1.5;
        }

        // 4. Moving Average Trend Alignment (EMA 9 vs EMA 21)
        if (ema9 > ema21) {
            evals.add(new IndicatorEvaluation(
                    "EMA 9/21 Trend Crossover",
                    "BUY",
                    "Fast 9-EMA ($" + String.format("%.2f", ema9) + ") is above slow 21-EMA ($" + String.format("%.2f", ema21) + "), exhibiting intact upward trend channel.",
                    2.0
            ));
            buyScore += 2.0;
            totalWeight += 2.0;
        } else {
            evals.add(new IndicatorEvaluation(
                    "EMA 9/21 Trend Crossover",
                    "HOLD",
                    "Fast 9-EMA ($" + String.format("%.2f", ema9) + ") converging near 21-EMA ($" + String.format("%.2f", ema21) + ").",
                    1.0
            ));
            totalWeight += 1.0;
        }

        // 5. Relative Volume & Catalyst Expansion
        if (relativeVolume >= 1.5 || dayChangePct > 15.0) {
            evals.add(new IndicatorEvaluation(
                    "Relative Volume Spike",
                    "BUY",
                    "Volume is expanding at " + String.format("%.1f", relativeVolume) + "x normal pace (Day Change: " + (dayChangePct >= 0 ? "+" : "") + String.format("%.1f%%", dayChangePct) + ").",
                    1.5
            ));
            buyScore += 1.5;
            totalWeight += 1.5;
        }

        // 6. Cost Basis & Target Margin Check (if owned position)
        if (costBasis != null && costBasis.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pnlPct = currentPrice.subtract(costBasis)
                    .divide(costBasis, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            BigDecimal targetProfit = targetProfitMarginPct != null ? targetProfitMarginPct : new BigDecimal("5.00");
            BigDecimal stopLoss = stopLossMarginPct != null ? stopLossMarginPct : new BigDecimal("3.00");

            if (pnlPct.compareTo(targetProfit) >= 0) {
                evals.add(new IndicatorEvaluation(
                        "Custom Profit Target Margin",
                        "SELL",
                        "Target profit margin reached: +" + pnlPct.setScale(2, RoundingMode.HALF_UP) + "% (Target: " + targetProfit + "%). Take profit recommended.",
                        2.5
                ));
                sellScore += 2.5;
                totalWeight += 2.5;
            } else if (pnlPct.compareTo(stopLoss.negate()) <= 0) {
                // If the stock is in an extreme oversold condition, do not panic sell at bottom
                if (rsi14 < 32.0 || detectedSignal.contains("OVERSOLD") || detectedSignal.contains("REVERSAL")) {
                    evals.add(new IndicatorEvaluation(
                            "Oversold Rebound vs Stop Loss",
                            "HOLD",
                            "Position is down " + pnlPct.setScale(2, RoundingMode.HALF_UP) + "%, but extreme oversold reversal (RSI " + String.format("%.1f", rsi14) + ") is active. Accumulation hold recommended over selling at the bottom.",
                            1.5
                    ));
                    totalWeight += 1.5;
                } else {
                    evals.add(new IndicatorEvaluation(
                            "Stop Loss Risk Margin",
                            "SELL",
                            "Stop loss threshold reached: " + pnlPct.setScale(2, RoundingMode.HALF_UP) + "% (Threshold: -" + stopLoss + "%). Risk mitigation sell alert.",
                            2.0
                    ));
                    sellScore += 2.0;
                    totalWeight += 2.0;
                }
            } else {
                evals.add(new IndicatorEvaluation(
                        "Position P&L Bracket",
                        "HOLD",
                        "Current P&L is " + (pnlPct.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + pnlPct.setScale(2, RoundingMode.HALF_UP) + "%, within target bracket (-" + stopLoss + "% to +" + targetProfit + "%).",
                        1.0
                ));
                totalWeight += 1.0;
            }
        }

        // 7. Compute Final Recommendation and Composite Score
        StrategyRecommendation finalRec;
        double confidence;
        String primaryReason;

        if (buyScore > sellScore && buyScore >= 2.0) {
            finalRec = StrategyRecommendation.BUY;
            confidence = Math.min(0.95, 0.55 + (buyScore / Math.max(totalWeight, 1.0)) * 0.40);
            primaryReason = evals.stream()
                    .filter(e -> "BUY".equals(e.signal()))
                    .findFirst()
                    .map(IndicatorEvaluation::description)
                    .orElse("Technical momentum and oversold reversal qualify for BUY.");
        } else if (sellScore > buyScore && sellScore >= 2.5) {
            finalRec = StrategyRecommendation.SELL;
            confidence = Math.min(0.95, 0.55 + (sellScore / Math.max(totalWeight, 1.0)) * 0.40);
            primaryReason = evals.stream()
                    .filter(e -> "SELL".equals(e.signal()))
                    .findFirst()
                    .map(IndicatorEvaluation::description)
                    .orElse("Profit target reached or distribution sell signals triggered.");
        } else {
            finalRec = StrategyRecommendation.HOLD;
            confidence = 0.70;
            primaryReason = "Indicators are balanced with no decisive breakout; maintaining current posture.";
        }

        StringBuilder detailed = new StringBuilder();
        detailed.append("Real-time multi-strategy diagnostic executed at ").append(Instant.now()).append(". ");
        detailed.append("Recommendation: ").append(finalRec).append(" (Confidence: ").append(String.format("%.1f%%", confidence * 100)).append("). ");
        detailed.append("Summary: ").append(primaryReason);

        return new StrategyDiagnosisResult(
                symbol,
                BigDecimal.valueOf(livePrice),
                finalRec,
                confidence,
                primaryReason,
                detailed.toString(),
                evals,
                Instant.now()
        );
    }
}

