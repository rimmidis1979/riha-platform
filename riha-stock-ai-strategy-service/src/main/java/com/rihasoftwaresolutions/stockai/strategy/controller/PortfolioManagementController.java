package com.rihasoftwaresolutions.stockai.strategy.controller;

import com.rihasoftwaresolutions.stockai.strategy.entity.StockTradeTransactionEntity;
import com.rihasoftwaresolutions.stockai.strategy.exception.InsufficientOwnedSharesException;
import com.rihasoftwaresolutions.stockai.strategy.service.StockAgenticWorkflowCoordinator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
    public ResponseEntity<Map<String, Object>> getAccountSummary(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(workflowCoordinator.getPortfolioAccountSummary());
    }

    @GetMapping("/positions")
    @Operation(summary = "Get list of currently owned positions (ownedQuantity > 0)")
    public ResponseEntity<List<Map<String, Object>>> getPositions(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(workflowCoordinator.getOwnedPositionsList());
    }

    @GetMapping("/transactions")
    @Operation(summary = "Get immutable ledger of stock trade transactions executed on platform (scoped to user)")
    public ResponseEntity<List<StockTradeTransactionEntity>> getTransactions(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(workflowCoordinator.getAllTransactions(userEmail));
    }

    @GetMapping("/performance-summary")
    @Operation(summary = "Get cumulative realized/unrealized profit loss and platform trading KPIs till date (scoped to user)")
    public ResponseEntity<Map<String, Object>> getPerformanceSummary(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(workflowCoordinator.getPerformanceSummary(userEmail));
    }

    @GetMapping("/auto-loops")
    @Operation(summary = "Get all stocks with active autonomous strategy monitoring loops (scoped to user)")
    public ResponseEntity<List<Map<String, Object>>> getActiveAutoLoops(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(workflowCoordinator.getActiveAutoLoops(userEmail));
    }

    @GetMapping("/strategies-history")
    @Operation(summary = "Get history of all AI strategies applied on stocks till date (scoped to user)")
    public ResponseEntity<Map<String, Object>> getStrategiesHistory(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(workflowCoordinator.getStrategiesHistory(userEmail));
    }

    @PostMapping("/orders")
    @Operation(summary = "Submit buy or sell order with deterministic position-gated SELL validation")
    public ResponseEntity<Map<String, Object>> submitOrder(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody Map<String, Object> request) {
        String ticker = String.valueOf(request.getOrDefault("ticker", "")).trim().toUpperCase(Locale.ROOT);
        String side = String.valueOf(request.getOrDefault("side", "BUY")).trim().toUpperCase(Locale.ROOT);
        int quantity = request.get("quantity") instanceof Number n ? n.intValue() : 10;

        if (userEmail != null && !userEmail.isBlank()) {
            request.put("userEmail", userEmail.trim());
        }

        if ("SELL".equalsIgnoreCase(side)) {
            int ownedQuantity = workflowCoordinator.getOwnedQuantityForTicker(ticker);
            if (ownedQuantity <= 0 || quantity > ownedQuantity) {
                throw new InsufficientOwnedSharesException(ticker, quantity, ownedQuantity);
            }
        }

        return ResponseEntity.ok(workflowCoordinator.executeTradeOrToggleMode(request));
    }
}

