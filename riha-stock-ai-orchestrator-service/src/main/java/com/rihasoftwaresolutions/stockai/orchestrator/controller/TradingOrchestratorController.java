package com.rihasoftwaresolutions.stockai.orchestrator.controller;

import com.rihasoftwaresolutions.stockai.orchestrator.entity.GlobalTradingSettingsEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.entity.StockMonitorEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.entity.TransactionRecordEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import com.rihasoftwaresolutions.stockai.orchestrator.service.TradingOrchestratorService;
import com.rihasoftwaresolutions.stockai.orchestrator.strategy.StrategyEvaluationEngine.StrategyDiagnosisResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/orchestrator")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Orchestrator", description = "Backbone Orchestration Service for Trading, Periodic Strategy Diagnosis, Robinhood Lifecycle, & Monitored Stocks")
public class TradingOrchestratorController {

    private final TradingOrchestratorService orchestratorService;

    public TradingOrchestratorController(TradingOrchestratorService orchestratorService) {
        this.orchestratorService = orchestratorService;
    }

    @GetMapping("/portfolio")
    @Operation(summary = "Fetch real-time portfolio, live buying power, owned stocks, and strategy recommendations")
    public ResponseEntity<Object> getPortfolio(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        var snapshot = orchestratorService.syncPortfolioFromRobinhood(userEmail);
        return ResponseEntity.ok(snapshot);
    }

    @PostMapping("/sync")
    @Operation(summary = "Force on-demand synchronization with Robinhood live brokerage")
    public ResponseEntity<Object> forceSync(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        var snapshot = orchestratorService.syncPortfolioFromRobinhood(userEmail);
        return ResponseEntity.ok(Map.of(
                "status", "SYNCHRONIZED",
                "portfolio", snapshot
        ));
    }

    @GetMapping("/orders/history")
    @Operation(summary = "Fetch complete transaction history with origin (RIHA_APP vs ROBINHOOD_DIRECT), mode (ACTUAL vs PAPERLESS), and P&L tracking")
    public ResponseEntity<List<TransactionRecordEntity>> getTransactionHistory(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestParam(value = "mode", required = false) ExecutionMode mode,
            @RequestParam(value = "origin", required = false) PurchaseOrigin origin,
            @RequestParam(value = "timeRange", required = false, defaultValue = "ALL") String timeRange) {
        return ResponseEntity.ok(orchestratorService.getTransactionHistory(userEmail, mode, origin, timeRange));
    }

    @GetMapping("/orders/current")
    @Operation(summary = "Fetch current working and open orders")
    public ResponseEntity<List<TransactionRecordEntity>> getCurrentOrders(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(orchestratorService.getTransactionHistory(userEmail, null, null, "1W"));
    }

    @GetMapping("/orders/pnl-summary")
    @Operation(summary = "Calculate aggregated P&L statistics comparing Actual vs Paperless across selected time range")
    public ResponseEntity<Map<String, Object>> getPnlSummary(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestParam(value = "timeRange", required = false, defaultValue = "ALL") String timeRange) {
        return ResponseEntity.ok(orchestratorService.calculatePnlSummary(userEmail, timeRange));
    }

    public record PlaceOrderRequest(
            String symbol,
            OrderSide side,
            OrderType orderType,
            BigDecimal quantity,
            BigDecimal price,
            ExecutionMode mode,
            String notes
    ) {}

    @PostMapping("/orders/place")
    @Operation(summary = "Place a new trade order (Actual Live Brokerage or Paperless Simulation)")
    public ResponseEntity<TransactionRecordEntity> placeOrder(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @Valid @RequestBody PlaceOrderRequest req) {
        TransactionRecordEntity tx = orchestratorService.executeOrder(
                userEmail,
                req.symbol(),
                req.side() != null ? req.side() : OrderSide.BUY,
                req.orderType() != null ? req.orderType() : OrderType.MARKET,
                req.quantity() != null ? req.quantity() : BigDecimal.ONE,
                req.price(),
                req.mode(),
                req.notes() != null ? req.notes() : "Placed from riha-stock-web"
        );
        return ResponseEntity.ok(tx);
    }

    @GetMapping("/monitoring")
    @Operation(summary = "List all stocks under continuous strategy monitoring with live buy/sell/hold recommendation labels")
    public ResponseEntity<List<StockMonitorEntity>> getMonitoredStocks(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(orchestratorService.getMonitoredStocks(userEmail));
    }

    public record AddMonitorRequest(
            String symbol,
            String companyName,
            Boolean isContinuous,
            Boolean autoBuy,
            Boolean autoSell,
            BigDecimal profitMarginPct,
            BigDecimal stopLossMarginPct,
            BigDecimal maxQuantity,
            ExecutionMode mode
    ) {}

    @PostMapping("/monitoring")
    @Operation(summary = "Add a stock for monitoring with custom profit margin %, stop loss %, and continuous scan checkbox")
    public ResponseEntity<StockMonitorEntity> addStockToMonitor(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @Valid @RequestBody AddMonitorRequest req) {
        StockMonitorEntity m = orchestratorService.addStockToMonitor(
                userEmail,
                req.symbol(),
                req.companyName(),
                req.isContinuous() != null ? req.isContinuous() : true,
                req.autoBuy() != null ? req.autoBuy() : false,
                req.autoSell() != null ? req.autoSell() : false,
                req.profitMarginPct(),
                req.stopLossMarginPct(),
                req.maxQuantity(),
                req.mode()
        );
        return ResponseEntity.ok(m);
    }

    @PutMapping("/monitoring/{symbol}")
    @Operation(summary = "Update custom options (profit target %, stop loss %, auto-trade) for a monitored or owned stock")
    public ResponseEntity<StockMonitorEntity> updateStockMonitorOptions(
            @PathVariable("symbol") String symbol,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @Valid @RequestBody AddMonitorRequest req) {
        StockMonitorEntity m = orchestratorService.addStockToMonitor(
                userEmail,
                symbol,
                req.companyName(),
                req.isContinuous() != null ? req.isContinuous() : true,
                req.autoBuy() != null ? req.autoBuy() : false,
                req.autoSell() != null ? req.autoSell() : false,
                req.profitMarginPct(),
                req.stopLossMarginPct(),
                req.maxQuantity(),
                req.mode()
        );
        return ResponseEntity.ok(m);
    }

    @DeleteMapping("/monitoring/{symbol}")
    @Operation(summary = "Remove a stock from continuous monitoring")
    public ResponseEntity<Map<String, Object>> deleteStockMonitor(
            @PathVariable("symbol") String symbol,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        orchestratorService.deleteMonitoredStock(userEmail, symbol);
        return ResponseEntity.ok(Map.of("status", "DELETED", "symbol", symbol));
    }

    @GetMapping("/strategies/diagnostics/{symbol}")
    @Operation(summary = "Run real-time multi-strategy evaluation and get immediate buy/sell/hold recommendation diagnosis")
    public ResponseEntity<StrategyDiagnosisResult> getStrategyDiagnostics(
            @PathVariable("symbol") String symbol) {
        return ResponseEntity.ok(orchestratorService.getLiveStrategyDiagnosis(symbol));
    }

    @GetMapping("/settings")
    @Operation(summary = "Get user global trading settings (Top Toggle: Paperless vs Actual, Auto-Trading master switch)")
    public ResponseEntity<GlobalTradingSettingsEntity> getSettings(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(orchestratorService.getOrCreateSettings(userEmail));
    }

    public record UpdateSettingsRequest(
            ExecutionMode globalExecutionMode,
            Boolean autoTradingEnabled
    ) {}

    @PostMapping("/settings")
    @Operation(summary = "Update global trading mode (Auto Real Trading vs Paperless Trading)")
    public ResponseEntity<GlobalTradingSettingsEntity> updateSettings(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody UpdateSettingsRequest req) {
        return ResponseEntity.ok(orchestratorService.updateSettings(
                userEmail,
                req.globalExecutionMode(),
                req.autoTradingEnabled()
        ));
    }
}

