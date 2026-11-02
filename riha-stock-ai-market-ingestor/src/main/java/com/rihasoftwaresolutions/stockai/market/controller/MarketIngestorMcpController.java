package com.rihasoftwaresolutions.stockai.market.controller;

import com.rihasoftwaresolutions.stockai.market.mcp.MarketIngestorMcpTools;
import com.rihasoftwaresolutions.stockai.market.model.DiscoveryAlgorithm;
import com.rihasoftwaresolutions.stockai.market.model.LiveQuoteTechnicalsSnapshot;
import com.rihasoftwaresolutions.stockai.market.model.OrderBookDepthSnapshot;
import com.rihasoftwaresolutions.stockai.market.model.SecFilingCatalystRecord;
import com.rihasoftwaresolutions.stockai.market.service.LiveMarketWebSocketAndStreamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Market Ingestor & MCP Server", description = "Live market WebSocket/REST ingestor, Redis snapshot cache, and Spring MCP Tool server")
public class MarketIngestorMcpController {

    private final MarketIngestorMcpTools mcpTools;
    private final LiveMarketWebSocketAndStreamService marketStreamService;

    public MarketIngestorMcpController(
            MarketIngestorMcpTools mcpTools,
            LiveMarketWebSocketAndStreamService marketStreamService) {
        this.mcpTools = mcpTools;
        this.marketStreamService = marketStreamService;
    }

    @PostMapping("/mcp/tools/{toolName}")
    @Operation(summary = "Invoke an MCP @Tool / @McpTool method registered for riha-stock-ai-market-ingestor")
    public ResponseEntity<Object> invokeMcpTool(
            @PathVariable String toolName,
            @RequestBody(required = false) Map<String, Object> arguments) {
        Map<String, Object> args = arguments != null ? arguments : Map.of();
        String ticker = String.valueOf(args.getOrDefault("ticker", "NVDA"));

        return switch (toolName.trim().toLowerCase(Locale.ROOT)) {
            case "fetchstocksbyalgorithm" -> {
                String date = String.valueOf(args.getOrDefault("date", ""));
                DiscoveryAlgorithm algo = DiscoveryAlgorithm.fromString(String.valueOf(args.getOrDefault("algorithm", "ALL")));
                int limit = args.get("limit") instanceof Number n ? n.intValue() : 20;
                yield ResponseEntity.ok(mcpTools.fetchStocksByAlgorithm(date, algo, limit));
            }
            case "getunderneathtechnicalsnapshot" -> ResponseEntity.ok(mcpTools.getUnderneathTechnicalSnapshot(ticker));
            case "getlivesecfilingsandcatalysts" -> ResponseEntity.ok(mcpTools.getLiveSecFilingsAndCatalysts(ticker));
            case "getlivequoteandtechnicals" -> ResponseEntity.ok(mcpTools.getLiveQuoteAndTechnicals(ticker));
            case "getliveorderbookdepth" -> ResponseEntity.ok(mcpTools.getLiveOrderBookDepth(ticker));
            case "getrecentsecfilings" -> ResponseEntity.ok(mcpTools.getRecentSecFilings(ticker));
            case "gettopmarketmovers" -> ResponseEntity.ok(
                    marketStreamService.fetchTopMarketMovers(String.valueOf(args.getOrDefault("window", "1D")))
            );
            case "getmarketregimesnapshot" -> ResponseEntity.ok(mcpTools.getMarketRegimeSnapshot());
            case "getorderflowmicrostructure" -> ResponseEntity.ok(mcpTools.getOrderFlowMicrostructure(ticker));
            case "getinsidertransactions" -> ResponseEntity.ok(mcpTools.getInsiderTransactions(ticker));
            case "fetchtopmoversbywindow" -> {
                String window = String.valueOf(args.getOrDefault("window", "1D"));
                Double minRvol = args.get("minRelativeVolume") instanceof Number n ? n.doubleValue() : 2.5;
                Double minPrice = args.get("minPrice") instanceof Number n ? n.doubleValue() : 1.00;
                Long maxFloat = args.get("maxFloat") instanceof Number n ? n.longValue() : 50_000_000L;
                yield ResponseEntity.ok(mcpTools.fetchTopMoversByWindow(window, minRvol, minPrice, maxFloat));
            }
            default -> throw new IllegalArgumentException("Unsupported MCP tool on riha-stock-ai-market-ingestor: " + toolName);
        };
    }

    @GetMapping("/market/stocks-by-algorithm")
    @Operation(summary = "Screen live market stocks by DiscoveryAlgorithm (TOP_GAINERS_DAY, RVOL_BREAKOUT, SHORT_SQUEEZE_MICROCAP, VWAP_RECLAIM_MOMENTUM, HIGH_CONVICTION_MULTI_FACTOR)")
    public ResponseEntity<List<Map<String, Object>>> getStocksByAlgorithm(
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "ALL") String algorithm,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(mcpTools.fetchStocksByAlgorithm(date, DiscoveryAlgorithm.fromString(algorithm), limit));
    }

    @GetMapping("/market/underneath-technicals/{ticker}")
    @Operation(summary = "Get complete underneath technical indicators, EMAs, MACD, RVOL, L2 spread, and intraday price series for a ticker")
    public ResponseEntity<Map<String, Object>> getUnderneathTechnicals(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getUnderneathTechnicalSnapshot(ticker));
    }

    @GetMapping("/market/sec-catalysts/{ticker}")
    @Operation(summary = "Get live SEC EDGAR filings and catalyst summary for a ticker")
    public ResponseEntity<SecFilingCatalystRecord> getSecCatalysts(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getLiveSecFilingsAndCatalysts(ticker));
    }

    @GetMapping("/market/quotes/{ticker}")
    @Operation(summary = "Get live quote and technical indicators for a ticker (fails with 503 ProblemDetail if live feed is disconnected)")
    public ResponseEntity<LiveQuoteTechnicalsSnapshot> getQuote(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getLiveQuoteAndTechnicals(ticker));
    }

    @GetMapping("/market/orderbook/{ticker}")
    @Operation(summary = "Get live Level-2 order book depth for a ticker")
    public ResponseEntity<OrderBookDepthSnapshot> getOrderBook(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getLiveOrderBookDepth(ticker));
    }

    @GetMapping("/market/sec-filings/{ticker}")
    @Operation(summary = "Get recent live SEC EDGAR filings and dilution analysis for a ticker")
    public ResponseEntity<SecFilingCatalystRecord> getSecFilings(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getRecentSecFilings(ticker));
    }

    @GetMapping("/market/watchlist")
    @Operation(summary = "Get live watchlist quotes from connected market stream")
    public ResponseEntity<List<LiveQuoteTechnicalsSnapshot>> getLiveWatchlist() {
        return ResponseEntity.ok(marketStreamService.getLiveWatchlistSnapshots());
    }

    @GetMapping("/market/top-movers")
    @Operation(summary = "Fetch top active market stocks ranked by relative volume and technical breakout for the Day (1D) or Hour (1H)")
    public ResponseEntity<List<LiveQuoteTechnicalsSnapshot>> getTopMovers(
            @RequestParam(defaultValue = "1D") String window) {
        return ResponseEntity.ok(marketStreamService.fetchTopMarketMovers(window));
    }

    @GetMapping("/market/feed-status")
    @Operation(summary = "Get live external market WebSocket/REST feed connection status")
    public ResponseEntity<Map<String, Object>> getFeedStatus() {
        return ResponseEntity.ok(marketStreamService.getFeedConnectionStatus());
    }

    @GetMapping("/market/regime")
    @Operation(summary = "Get macroeconomic & market regime sensory snapshot (S&P 500, Nasdaq, VIX contango, 10Y yield, economic countdowns)")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.market.model.MarketRegimeSnapshot> getMarketRegime() {
        return ResponseEntity.ok(mcpTools.getMarketRegimeSnapshot());
    }

    @GetMapping("/market/order-flow/{ticker}")
    @Operation(summary = "Get order flow microstructure, cumulative volume delta (CVD), order book imbalance, spread percentiles, and ATR-14")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.market.model.OrderFlowMicrostructure> getOrderFlow(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getOrderFlowMicrostructure(ticker));
    }

    @GetMapping("/market/insider-transactions/{ticker}")
    @Operation(summary = "Get SEC Form 4 insider trading filings, 90-day net dollar flow, and cluster transaction analysis")
    public ResponseEntity<com.rihasoftwaresolutions.stockai.market.model.InsiderTransactionRecord> getInsiderTransactions(@PathVariable String ticker) {
        return ResponseEntity.ok(mcpTools.getInsiderTransactions(ticker));
    }
}
