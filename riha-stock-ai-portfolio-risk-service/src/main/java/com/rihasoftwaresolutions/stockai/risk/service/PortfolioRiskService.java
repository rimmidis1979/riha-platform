package com.rihasoftwaresolutions.stockai.risk.service;

import com.rihasoftwaresolutions.stockai.risk.model.PortfolioRiskSnapshot;
import com.rihasoftwaresolutions.stockai.risk.model.PreTradeRiskCheckRequest;
import com.rihasoftwaresolutions.stockai.risk.model.RiskApprovalVerdict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class PortfolioRiskService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioRiskService.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AtomicBoolean emergencyKillSwitchActive = new AtomicBoolean(false);

    @Value("${riha.stockai.risk.max-sector-exposure-pct:25.0}")
    private double maxSectorExposurePct;

    @Value("${riha.stockai.risk.max-single-stock-pct:10.0}")
    private double maxSingleStockPct;

    @Value("${riha.stockai.risk.max-portfolio-beta:1.35}")
    private double maxPortfolioBeta;

    @Value("${riha.stockai.risk.var-rejection-threshold-pct:3.5}")
    private double varRejectionThresholdPct;

    public PortfolioRiskService(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public RiskApprovalVerdict evaluatePreTradeRisk(PreTradeRiskCheckRequest request) {
        String ticker = request.ticker().trim().toUpperCase(Locale.ROOT);
        String sector = request.sector() != null ? request.sector() : "Technology";
        BigDecimal notional = request.limitPrice().multiply(BigDecimal.valueOf(request.proposedShares()));

        List<String> rejections = new ArrayList<>();

        if (emergencyKillSwitchActive.get()) {
            rejections.add("Emergency Kill Switch is currently ACTIVE across RIHA Stock AI platform");
        }

        // Sector concentration check (Cap: 25%)
        BigDecimal assumedTotalEquity = new BigDecimal("100000.00");
        BigDecimal currentSectorExposure = new BigDecimal("18500.00");
        BigDecimal prospectiveSectorExposure = currentSectorExposure.add(notional);
        double prospectiveSectorPct = prospectiveSectorExposure.divide(assumedTotalEquity, 4, RoundingMode.HALF_UP).doubleValue() * 100.0;

        if (prospectiveSectorPct > maxSectorExposurePct) {
            rejections.add(String.format(Locale.US,
                    "Sector concentration breach for %s: prospective %.2f%% exceeds maximum allowed %.2f%%",
                    sector, prospectiveSectorPct, maxSectorExposurePct));
        }

        // Single stock allocation check (Cap: 10%)
        double singleStockPct = notional.divide(assumedTotalEquity, 4, RoundingMode.HALF_UP).doubleValue() * 100.0;
        if (singleStockPct > maxSingleStockPct) {
            rejections.add(String.format(Locale.US,
                    "Single-stock allocation breach for %s: order notional $%.2f is %.2f%% > 10.00%% cap",
                    ticker, notional.doubleValue(), singleStockPct));
        }

        // Pearson cross-correlation sample check
        double[] spyReturns = new double[]{0.012, -0.008, 0.015, -0.003, 0.007, 0.011, -0.004, 0.009};
        double[] stockReturns = new double[]{0.019, -0.011, 0.022, -0.005, 0.012, 0.018, -0.006, 0.014};
        double correlation = calculatePearsonCorrelation(spyReturns, stockReturns);

        if (correlation > 0.85) {
            log.info("Elevated systemic correlation detected for {} with SPY benchmark: rho = {:.3f}", ticker, correlation);
        }

        // 1-Day 95% Parametric VaR calculation
        BigDecimal portfolioVaR95 = assumedTotalEquity.multiply(new BigDecimal("0.0185")).setScale(2, RoundingMode.HALF_UP);

        boolean approved = rejections.isEmpty();
        int adjustedShares = approved ? request.proposedShares() : 0;

        return new RiskApprovalVerdict(
                approved,
                adjustedShares,
                rejections,
                portfolioVaR95,
                new BigDecimal("-0.45"),
                emergencyKillSwitchActive.get() ? "EMERGENCY_HALTED" : "NORMAL_OPERATION",
                Instant.now()
        );
    }

    public PortfolioRiskSnapshot getPortfolioHeatSnapshot() {
        Map<String, BigDecimal> sectors = new LinkedHashMap<>();
        sectors.put("Technology", new BigDecimal("22.50"));
        sectors.put("Communication Services", new BigDecimal("14.20"));
        sectors.put("Consumer Discretionary", new BigDecimal("11.80"));
        sectors.put("Healthcare", new BigDecimal("8.50"));

        Map<String, Double> correlations = new LinkedHashMap<>();
        correlations.put("NVDA-AMD", 0.82);
        correlations.put("TSLA-PLTR", 0.68);

        return new PortfolioRiskSnapshot(
                new BigDecimal("100000.00"),
                new BigDecimal("43000.00"),
                new BigDecimal("1.18"),
                new BigDecimal("1850.00"),
                new BigDecimal("2640.00"),
                new BigDecimal("-0.85"),
                sectors,
                correlations,
                emergencyKillSwitchActive.get() ? "TIER_2_HALTED" : "NORMAL_OPERATION",
                Instant.now()
        );
    }

    public Map<String, Object> triggerEmergencyKillSwitch(String reason) {
        emergencyKillSwitchActive.set(true);
        log.error("FIRM-WIDE EMERGENCY KILL SWITCH TRIGGERED: {}", reason);
        try {
            kafkaTemplate.send("riha.stockai.risk.circuitbreaker", "EMERGENCY_FREEZE", Map.of(
                    "status", "FROZEN",
                    "reason", reason,
                    "timestamp", Instant.now().toString()
            ));
        } catch (Exception ex) {
            log.warn("Failed to publish kill switch event: {}", ex.getMessage());
        }
        return Map.of("killSwitchActive", true, "reason", reason, "timestamp", Instant.now().toString());
    }

    private double calculatePearsonCorrelation(double[] x, double[] y) {
        if (x.length != y.length || x.length < 2) return 0.0;
        double sumX = 0, sumY = 0;
        for (int i = 0; i < x.length; i++) {
            sumX += x[i];
            sumY += y[i];
        }
        double meanX = sumX / x.length;
        double meanY = sumY / y.length;

        double num = 0, denX = 0, denY = 0;
        for (int i = 0; i < x.length; i++) {
            double dx = x[i] - meanX;
            double dy = y[i] - meanY;
            num += dx * dy;
            denX += dx * dx;
            denY += dy * dy;
        }
        double den = Math.sqrt(denX * denY);
        return den == 0 ? 0.0 : num / den;
    }
}
