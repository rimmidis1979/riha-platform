package com.rihasoftwaresolutions.stockai.strategy.controller;

import com.rihasoftwaresolutions.stockai.strategy.service.StockAgenticWorkflowCoordinator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock-ai")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Executive Command & Watchlist Controller", description = "Algorithmic stock discovery, watchlist management, underneath 4-pillar analysis, and executive account/trade summary endpoints")
public class StockAiCommandController {

    private final StockAgenticWorkflowCoordinator workflowCoordinator;

    public StockAiCommandController(StockAgenticWorkflowCoordinator workflowCoordinator) {
        this.workflowCoordinator = workflowCoordinator;
    }

    @GetMapping("/stocks")
    @Operation(summary = "Fetch live algorithmic movers merged with user watchlist stocks, filtered by date, algorithm, signal, and search")
    public ResponseEntity<List<Map<String, Object>>> getStocks(
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "ALL") String algorithm,
            @RequestParam(defaultValue = "ALL") String signal,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(workflowCoordinator.getEnrichedStocksList(date, algorithm, signal, search));
    }

    @PostMapping("/stocks")
    @Operation(summary = "Validate ticker against live market feed, save to tracked_watchlist_stocks, and immediately launch 5-Node Agentic DAG analysis")
    public ResponseEntity<Map<String, Object>> addStock(@RequestBody Map<String, Object> body) {
        String ticker = String.valueOf(body.getOrDefault("ticker", ""));
        boolean runImmediate = !body.containsKey("runImmediateAnalysis") || Boolean.TRUE.equals(body.get("runImmediateAnalysis"));
        return ResponseEntity.ok(workflowCoordinator.addStockAndAnalyze(ticker, runImmediate));
    }

    @DeleteMapping("/stocks/{ticker}")
    @Operation(summary = "Delete a stock from the active watchlist and stop active polling for that symbol")
    public ResponseEntity<Map<String, Object>> deleteStock(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.deleteStockFromWatchlist(ticker));
    }

    @PostMapping("/stocks/{ticker}/analyze-now")
    @Operation(summary = "Force an immediate on-the-fly 5-node DAG re-evaluation of the stock across all strategies")
    public ResponseEntity<Map<String, Object>> analyzeStockNow(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.analyzeStockOnTheFly(ticker));
    }

    @GetMapping("/stocks/{ticker}/underneath-analysis")
    @Operation(summary = "Return the complete 4-pillar underneath analysis, strategies implemented, price predictions, intraday chart series, and Critic review audit")
    public ResponseEntity<Map<String, Object>> getUnderneathAnalysis(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.getUnderneathAnalysisForTicker(ticker));
    }

    @PostMapping("/trades/execute")
    @Operation(summary = "Execute one-click BUY/SELL trade or toggle autonomous trading mode via Critic Engine and Robinhood MCP")
    public ResponseEntity<Map<String, Object>> executeTrade(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(workflowCoordinator.executeTradeOrToggleMode(request));
    }

    @GetMapping("/summary/executive")
    @Operation(summary = "Return combined Overall Account Summary and Overall Buy/Sell Summary with full transaction ledger")
    public ResponseEntity<Map<String, Object>> getExecutiveSummary() {
        return ResponseEntity.ok(workflowCoordinator.getExecutiveCommandSummary());
    }

    @GetMapping(value = "/stream/live-events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Real-time SSE stream pushing live price ticks, DAG node transitions, Critic verdicts, and trade fill notifications")
    public SseEmitter streamLiveEvents() {
        return workflowCoordinator.registerLiveEventsStream();
    }
}

