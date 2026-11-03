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
    private final com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService stockTradingService;

    public TradingOrchestratorController(
            TradingOrchestratorService orchestratorService,
            com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService stockTradingService) {
        this.orchestratorService = orchestratorService;
        this.stockTradingService = stockTradingService;
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
            BrokerType broker,
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
                req.broker(),
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

    public record UpdateBrokerModeRequest(
            BrokerType broker,
            ExecutionMode executionMode
    ) {}

    @PutMapping("/settings/broker-mode")
    @Operation(summary = "Update execution mode (PAPERLESS vs ACTUAL) for a specific broker (Robinhood or Charles Schwab)")
    public ResponseEntity<GlobalTradingSettingsEntity> updateBrokerMode(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody UpdateBrokerModeRequest req) {
        return ResponseEntity.ok(orchestratorService.updateBrokerExecutionMode(
                userEmail,
                req.broker() != null ? req.broker() : BrokerType.ROBINHOOD,
                req.executionMode() != null ? req.executionMode() : ExecutionMode.PAPERLESS
        ));
    }

    public record UpdateStrategicLoopRequest(
            Boolean runStrategicLoop,
            ExecutionMode executionMode
    ) {}

    @PutMapping("/stocks/{symbol}/strategic-loop")
    @Operation(summary = "Enable or disable continuous strategic loop and toggle Paperless vs Actual at the stock level")
    public ResponseEntity<StockMonitorEntity> updateStockStrategicLoop(
            @PathVariable("symbol") String symbol,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody UpdateStrategicLoopRequest req) {
        return ResponseEntity.ok(orchestratorService.updateStockStrategicLoop(
                userEmail,
                symbol,
                req.runStrategicLoop(),
                req.executionMode()
        ));
    }

    // ==========================================
    // ROBINHOOD AUTHENTICATION & STOCKS TRADING
    // ==========================================

    @PostMapping("/robinhood/auth/login")
    @Operation(summary = "Authenticate live with Robinhood via username/password (+ optional MFA) or direct Bearer token")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodAuthResponse> authenticateRobinhoodLive(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodAuthLoginRequest req) {
        var res = stockTradingService.authenticateRobinhoodLive(
                userEmail,
                req.username(),
                req.password(),
                req.mfaCode(),
                req.directToken()
        );
        return ResponseEntity.ok(res);
    }

    @GetMapping("/robinhood/auth/status")
    @Operation(summary = "Check current Robinhood live authentication status and account details")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodAuthResponse> getRobinhoodAuthStatus(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(stockTradingService.getRobinhoodAuthStatus(userEmail));
    }

    @PostMapping("/robinhood/auth/logout")
    @Operation(summary = "Disconnect Robinhood session and clear stored tokens")
    public ResponseEntity<Map<String, Object>> disconnectRobinhood(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(stockTradingService.disconnectRobinhood(userEmail));
    }

    @PostMapping("/robinhood/stocks/sync-orders")
    @Operation(summary = "Fetch and sync real-time stock purchase and transaction history from Robinhood live API")
    public ResponseEntity<List<TransactionRecordEntity>> syncRobinhoodStockOrders(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(stockTradingService.syncRobinhoodStockOrders(userEmail));
    }

    @GetMapping("/robinhood/stocks")
    @Operation(summary = "List owned Robinhood stocks (equities) with real-time equity, avg cost, today/total return, and strategy diagnosis")
    public ResponseEntity<List<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodStockHolding>> getRobinhoodStocks(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(stockTradingService.getOwnedStocks(userEmail));
    }

    @GetMapping("/robinhood/stocks/trending")
    @Operation(summary = "Get popular Robinhood equities with real-time price quotes ready to trade")
    public ResponseEntity<List<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodStockQuote>> getRobinhoodTrendingStocks() {
        return ResponseEntity.ok(stockTradingService.getTrendingStocks());
    }

    @GetMapping("/robinhood/stocks/quote/{symbol}")
    @Operation(summary = "Get live stock quote for a specific ticker")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodStockQuote> getRobinhoodStockQuote(
            @PathVariable("symbol") String symbol) {
        return ResponseEntity.ok(stockTradingService.getStockQuote(symbol));
    }

    public record RobinhoodStockOrderPayload(
            String symbol,
            BigDecimal quantity,
            BigDecimal price,
            OrderType orderType,
            ExecutionMode mode
    ) {}

    @PostMapping("/robinhood/stocks/buy")
    @Operation(summary = "Execute Robinhood stock market or limit BUY order (Actual or Paperless)")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodStockOrderResult> buyRobinhoodStock(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody RobinhoodStockOrderPayload req) {
        var res = stockTradingService.executeBuyStock(
                userEmail,
                req.symbol(),
                req.quantity() != null ? req.quantity() : BigDecimal.ONE,
                req.price(),
                req.orderType() != null ? req.orderType() : OrderType.MARKET,
                req.mode()
        );
        return ResponseEntity.ok(res);
    }

    @PostMapping("/robinhood/stocks/sell")
    @Operation(summary = "Execute Robinhood stock market or limit SELL order (Actual or Paperless)")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.orchestrator.service.RobinhoodStockTradingService.RobinhoodStockOrderResult> sellRobinhoodStock(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody RobinhoodStockOrderPayload req) {
        var res = stockTradingService.executeSellStock(
                userEmail,
                req.symbol(),
                req.quantity() != null ? req.quantity() : BigDecimal.ONE,
                req.price(),
                req.orderType() != null ? req.orderType() : OrderType.MARKET,
                req.mode()
        );
        return ResponseEntity.ok(res);
    }

    // ==========================================
    // CHARLES SCHWAB INTEGRATION & CALLBACKS
    // ==========================================

    @GetMapping("/schwab/auth-url")
    @Operation(summary = "Get Charles Schwab OAuth authorization URL")
    public ResponseEntity<Map<String, String>> getSchwabAuthUrl(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestParam(value = "redirectUri", required = false) String redirectUri) {
        String url = orchestratorService.getSchwabService().generateAuthorizeUrl(userEmail, redirectUri);
        return ResponseEntity.ok(Map.of(
                "authUrl", url,
                "clientId", orchestratorService.getSchwabService().getEffectiveClientId(userEmail)
        ));
    }

    @GetMapping("/schwab/callback")
    @Operation(summary = "OAuth callback listener for Charles Schwab redirect")
    public ResponseEntity<String> handleSchwabCallbackGet(
            @RequestParam("code") String code,
            @RequestParam(value = "session", required = false) String session,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {

        try {
            orchestratorService.getSchwabService().exchangeAuthorizationCode(userEmail, code, null);
            orchestratorService.syncPortfolioFromSchwab(userEmail);

            String htmlSuccess = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Charles Schwab Connected - RIHA Stock AI</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 2.5rem; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                        h2 { color: #10b981; margin-top: 0; }
                        p { color: #9ca3af; line-height: 1.5; font-size: 0.95rem; }
                        .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2>✓ Charles Schwab Connected</h2>
                        <p>Your Charles Schwab brokerage account has been successfully authenticated and synchronized with RIHA Stock AI Orchestrator.</p>
                        <a href="https://localhost:5175/account" class="btn">Return to My Account</a>
                    </div>
                </body>
                </html>
                """;
            return ResponseEntity.ok().header("Content-Type", "text/html").body(htmlSuccess);
        } catch (Exception ex) {
            String htmlError = "<!DOCTYPE html><html><body style='background:#0b0f19;color:#ef4444;font-family:sans-serif;padding:2rem;'><h2>Authentication Error</h2><p>" + ex.getMessage() + "</p></body></html>";
            return ResponseEntity.badRequest().header("Content-Type", "text/html").body(htmlError);
        }
    }

    public record SchwabExchangeRequest(String code, String redirectUri) {}

    @PostMapping("/schwab/callback")
    @Operation(summary = "Exchange Charles Schwab auth code via JSON POST")
    public ResponseEntity<Map<String, Object>> handleSchwabCallbackPost(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody SchwabExchangeRequest req) {
        var res = orchestratorService.getSchwabService().exchangeAuthorizationCode(userEmail, req.code(), req.redirectUri());
        orchestratorService.syncPortfolioFromSchwab(userEmail);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/schwab/webhook")
    @Operation(summary = "Webhook listener for Charles Schwab asynchronous account events")
    public ResponseEntity<Map<String, Object>> handleSchwabWebhook(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody(required = false) Map<String, Object> payload) {
        orchestratorService.syncPortfolioFromSchwab(userEmail);
        return ResponseEntity.ok(Map.of(
                "status", "EVENT_PROCESSED",
                "timestamp", java.time.Instant.now().toString()
        ));
    }

    @GetMapping("/schwab/portfolio")
    @Operation(summary = "Fetch real-time Charles Schwab portfolio, balances, and orders")
    public ResponseEntity<Object> getSchwabPortfolio(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        var snapshot = orchestratorService.syncPortfolioFromSchwab(userEmail);
        return ResponseEntity.ok(snapshot);
    }

    @GetMapping("/schwab/transactions")
    @Operation(summary = "Fetch Charles Schwab transaction history")
    public ResponseEntity<List<Map<String, Object>>> getSchwabTransactions(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ResponseEntity.ok(orchestratorService.getSchwabService().fetchSchwabTransactions(userEmail));
    }

    @GetMapping("/portfolio/consolidated")
    @Operation(summary = "Fetch consolidated portfolio telemetry across Robinhood & Charles Schwab")
    public ResponseEntity<Map<String, Object>> getConsolidatedPortfolio(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        var rbSnapshot = orchestratorService.syncPortfolioFromRobinhood(userEmail);
        var schwabSnapshot = orchestratorService.syncPortfolioFromSchwab(userEmail);
        var settings = orchestratorService.getOrCreateSettings(userEmail);

        BigDecimal totalCash = rbSnapshot.cashBalance().add(schwabSnapshot.cashBalance());
        BigDecimal totalEquity = rbSnapshot.totalEquity().add(schwabSnapshot.totalEquity());
        BigDecimal totalBuyingPower = rbSnapshot.buyingPower().add(schwabSnapshot.buyingPower());

        return ResponseEntity.ok(Map.of(
                "totalCashBalance", totalCash,
                "totalEquityUsd", totalEquity,
                "totalBuyingPowerUsd", totalBuyingPower,
                "robinhood", rbSnapshot,
                "charlesSchwab", schwabSnapshot,
                "settings", settings,
                "retrievedAt", java.time.Instant.now().toString()
        ));
    }
}

