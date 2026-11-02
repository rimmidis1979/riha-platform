package com.rihasoftwaresolutions.stockai.risk.controller;

import com.rihasoftwaresolutions.stockai.risk.model.PortfolioRiskSnapshot;
import com.rihasoftwaresolutions.stockai.risk.model.PreTradeRiskCheckRequest;
import com.rihasoftwaresolutions.stockai.risk.model.RiskApprovalVerdict;
import com.rihasoftwaresolutions.stockai.risk.service.PortfolioRiskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/risk")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Portfolio Risk Guardian", description = "Portfolio Covariance Matrix, Sector Exposure Caps, Value-at-Risk (VaR), and Circuit Breakers")
public class PortfolioRiskController {

    private final PortfolioRiskService riskService;

    public PortfolioRiskController(PortfolioRiskService riskService) {
        this.riskService = riskService;
    }

    @PostMapping("/pre-trade-check")
    @Operation(summary = "Evaluate pre-trade risk against sector concentration caps (25%), single-stock limits (10%), and portfolio VaR")
    public ResponseEntity<RiskApprovalVerdict> preTradeCheck(@Valid @RequestBody PreTradeRiskCheckRequest request) {
        return ResponseEntity.ok(riskService.evaluatePreTradeRisk(request));
    }

    @GetMapping("/portfolio-heat")
    @Operation(summary = "Get real-time portfolio heat: sector breakdown, top correlations, beta, and 1-day 95% VaR")
    public ResponseEntity<PortfolioRiskSnapshot> getPortfolioHeat() {
        return ResponseEntity.ok(riskService.getPortfolioHeatSnapshot());
    }

    @PostMapping("/emergency-kill-switch")
    @Operation(summary = "Trigger firm-wide emergency circuit breaker freeze across all autonomous trading microservices")
    public ResponseEntity<Map<String, Object>> emergencyKillSwitch(
            @RequestParam(defaultValue = "Manual emergency operator override") String reason) {
        return ResponseEntity.ok(riskService.triggerEmergencyKillSwitch(reason));
    }
}
