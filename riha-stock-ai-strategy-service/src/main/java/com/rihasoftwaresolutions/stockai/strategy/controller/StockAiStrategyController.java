package com.rihasoftwaresolutions.stockai.strategy.controller;

import com.rihasoftwaresolutions.stockai.strategy.entity.AiTradeAuditTrailEntity;
import com.rihasoftwaresolutions.stockai.strategy.entity.AiTradeDecisionEntity;
import com.rihasoftwaresolutions.stockai.strategy.model.EvaluateTickerRequest;
import com.rihasoftwaresolutions.stockai.strategy.model.StrategyPromptBinding;
import com.rihasoftwaresolutions.stockai.strategy.service.HourlyAndDailyTopStocksScannerLoop;
import com.rihasoftwaresolutions.stockai.strategy.service.StockAiStrategyCoordinatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock-ai")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Strategy & Execution Coordinator", description = "Event-driven multi-agent DAG coordinator, PostgreSQL trade decision ledger, and real-time SSE decision streamer")
public class StockAiStrategyController {

    private final StockAiStrategyCoordinatorService coordinatorService;
    private final HourlyAndDailyTopStocksScannerLoop scannerLoop;

    public StockAiStrategyController(
            StockAiStrategyCoordinatorService coordinatorService,
            HourlyAndDailyTopStocksScannerLoop scannerLoop) {
        this.coordinatorService = coordinatorService;
        this.scannerLoop = scannerLoop;
    }

    @GetMapping(value = "/stream/decisions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Real-time SSE stream of AI trade decisions and DAG state transitions")
    public SseEmitter streamDecisions() {
        return coordinatorService.registerDecisionStreamEmitter();
    }

    @GetMapping(value = "/stream/live-audit", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Real-time SSE stream of multi-stock 5-node DAG progress and live audit trail events")
    public SseEmitter streamLiveAudit() {
        return scannerLoop.registerLiveAuditStreamEmitter();
    }

    @PostMapping("/scanner/run")
    @Operation(summary = "Trigger multi-stock on-the-fly 5-node DAG scan for Top Stocks of the Day (1D) or Hour (1H)")
    public ResponseEntity<Map<String, Object>> runTopStocksBatchScan(
            @RequestParam(defaultValue = "1D") String window,
            @RequestParam(required = false) String strategyId) {
        return ResponseEntity.ok(scannerLoop.executeBatchScan(window, strategyId));
    }

    @GetMapping("/auto-trade-mode")
    @Operation(summary = "Get current Autonomous Buy/Sell Execution mode (FULL_AUTO_MCP_EXECUTION vs RECOMMEND_ONLY)")
    public ResponseEntity<Map<String, Object>> getAutoTradeMode() {
        return ResponseEntity.ok(scannerLoop.getAutoTradeModeStatus());
    }

    @PutMapping("/auto-trade-mode")
    @Operation(summary = "Toggle Autonomous Buy/Sell Execution mode (FULL_AUTO_MCP_EXECUTION vs RECOMMEND_ONLY)")
    public ResponseEntity<Map<String, Object>> updateAutoTradeMode(@RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("autoTradeEnabled"));
        return ResponseEntity.ok(scannerLoop.updateAutoTradeMode(enabled));
    }

    @PostMapping("/recommendations/{auditId}/execute")
    @Operation(summary = "One-click execution for a Critic-approved BUY/SELL recommendation in RECOMMEND_ONLY mode")
    public ResponseEntity<AiTradeAuditTrailEntity> executeOneClickRecommendation(@PathVariable UUID auditId) {
        return ResponseEntity.ok(scannerLoop.executeOneClickRecommendation(auditId));
    }

    @GetMapping("/audit-summary")
    @Operation(summary = "Get Master Event Audit & Batch Summary Ledger with executive KPIs and full audit trail")
    public ResponseEntity<Map<String, Object>> getMasterAuditSummary(
            @RequestParam(defaultValue = "ALL") String window) {
        return ResponseEntity.ok(scannerLoop.getMasterAuditSummary(window));
    }

    @GetMapping("/decisions")
    @Operation(summary = "List persisted AiTradeDecisionEntity transactions from PostgreSQL (riha_stock_ai_db)")
    public ResponseEntity<List<AiTradeDecisionEntity>> listDecisions(
            @RequestParam(required = false) String ticker) {
        return ResponseEntity.ok(coordinatorService.listDecisions(ticker));
    }

    @GetMapping("/decisions/{decisionId}")
    @Operation(summary = "Get a specific AiTradeDecisionEntity by decisionId")
    public ResponseEntity<AiTradeDecisionEntity> getDecision(@PathVariable UUID decisionId) {
        return coordinatorService.getDecisionById(decisionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/evaluate")
    @Operation(summary = "Trigger immediate 5-node DAG AI evaluation for a ticker (fails with 503 ProblemDetail if live market feed is disconnected)")
    public ResponseEntity<AiTradeDecisionEntity> evaluateTicker(@Valid @RequestBody EvaluateTickerRequest request) {
        return ResponseEntity.ok(coordinatorService.evaluateTickerOnDag(request));
    }

    @GetMapping("/strategies")
    @Operation(summary = "List active strategy bindings linked to Version Control Hub prompts")
    public ResponseEntity<List<StrategyPromptBinding>> listStrategies() {
        return ResponseEntity.ok(coordinatorService.listStrategies());
    }

    @PutMapping("/strategies/{strategyId}/bind-prompt")
    @Operation(summary = "Bind an active trading strategy to a VALIDATED or PUBLISHED prompt version in riha-version-control-hub")
    public ResponseEntity<StrategyPromptBinding> bindStrategyPrompt(
            @PathVariable String strategyId,
            @RequestBody Map<String, String> updates) {
        return ResponseEntity.ok(coordinatorService.updateStrategyPromptBinding(strategyId, updates));
    }

    @GetMapping("/watchlist")
    @Operation(summary = "Fetch live watchlist snapshots from riha-stock-ai-market-ingestor (503 ProblemDetail when live feed disconnected)")
    public ResponseEntity<List<Map<String, Object>>> getLiveWatchlist() {
        return ResponseEntity.ok(coordinatorService.getLiveWatchlistFromIngestor());
    }

    @GetMapping("/portfolio")
    @Operation(summary = "Fetch live Robinhood account balances and open positions from riha-stock-ai-robinhood-mcp-server")
    public ResponseEntity<Map<String, Object>> getLivePortfolio() {
        return ResponseEntity.ok(coordinatorService.getLiveRobinhoodPortfolio());
    }

    @GetMapping("/risk-guardrails")
    @Operation(summary = "Fetch active deterministic SpEL risk guardrails for RIHA_STOCK_AI from riha-critic-engine")
    public ResponseEntity<Map<String, Object>> getRiskGuardrails() {
        return ResponseEntity.ok(coordinatorService.getCriticRiskGuardrails());
    }

    @PutMapping("/risk-guardrails")
    @Operation(summary = "Update maxPositionSizeUsd and maxDailyDrawdownLimitPct in riha-critic-engine")
    public ResponseEntity<Map<String, Object>> updateRiskGuardrails(@RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(coordinatorService.updateCriticRiskGuardrails(updates));
    }
}
