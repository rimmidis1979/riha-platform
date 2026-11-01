package com.rihasoftwaresolutions.stockai.strategy.controller;

import com.rihasoftwaresolutions.stockai.strategy.exception.InsufficientOwnedSharesException;
import com.rihasoftwaresolutions.stockai.strategy.service.StockAgenticWorkflowCoordinator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock-ai/portfolio")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Portfolio Management", description = "Personalized account summaries, live owned positions, and position-gated order execution")
public class PortfolioManagementController {

    private final StockAgenticWorkflowCoordinator workflowCoordinator;

    public PortfolioManagementController(StockAgenticWorkflowCoordinator workflowCoordinator) {
        this.workflowCoordinator = workflowCoordinator;
    }

    @GetMapping("/account-summary")
    @Operation(summary = "Get personalized portfolio account summary ribbon telemetry")
    public ResponseEntity<Map<String, Object>> getAccountSummary() {
        return ResponseEntity.ok(workflowCoordinator.getPortfolioAccountSummary());
    }

    @GetMapping("/positions")
    @Operation(summary = "Get list of currently owned positions (ownedQuantity > 0)")
    public ResponseEntity<List<Map<String, Object>>> getPositions() {
        return ResponseEntity.ok(workflowCoordinator.getOwnedPositionsList());
    }

    @PostMapping("/orders")
    @Operation(summary = "Submit buy or sell order with deterministic position-gated SELL validation")
    public ResponseEntity<Map<String, Object>> submitOrder(@RequestBody Map<String, Object> request) {
        String ticker = String.valueOf(request.getOrDefault("ticker", "")).trim().toUpperCase(Locale.ROOT);
        String side = String.valueOf(request.getOrDefault("side", "BUY")).trim().toUpperCase(Locale.ROOT);
        int quantity = request.get("quantity") instanceof Number n ? n.intValue() : 10;

        if ("SELL".equalsIgnoreCase(side)) {
            int ownedQuantity = workflowCoordinator.getOwnedQuantityForTicker(ticker);
            if (ownedQuantity <= 0 || quantity > ownedQuantity) {
                throw new InsufficientOwnedSharesException(ticker, quantity, ownedQuantity);
            }
        }

        return ResponseEntity.ok(workflowCoordinator.executeTradeOrToggleMode(request));
    }
}
