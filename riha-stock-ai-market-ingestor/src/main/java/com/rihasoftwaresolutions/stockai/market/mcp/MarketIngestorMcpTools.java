package com.rihasoftwaresolutions.stockai.market.mcp;

import com.rihasoftwaresolutions.stockai.market.annotation.McpTool;
import com.rihasoftwaresolutions.stockai.market.annotation.Tool;
import com.rihasoftwaresolutions.stockai.market.model.DiscoveryAlgorithm;
import com.rihasoftwaresolutions.stockai.market.model.LiveQuoteTechnicalsSnapshot;
import com.rihasoftwaresolutions.stockai.market.model.OrderBookDepthSnapshot;
import com.rihasoftwaresolutions.stockai.market.model.SecFilingCatalystRecord;
import com.rihasoftwaresolutions.stockai.market.service.LiveMarketWebSocketAndStreamService;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class MarketIngestorMcpTools {

    private final LiveMarketWebSocketAndStreamService marketStreamService;

    public MarketIngestorMcpTools(LiveMarketWebSocketAndStreamService marketStreamService) {
        this.marketStreamService = marketStreamService;
    }

    @Tool(
            name = "fetchStocksByAlgorithm",
            description = "Executes real-time algorithmic screening for the requested trading day/hour across TOP_GAINERS_DAY, RVOL_BREAKOUT, SHORT_SQUEEZE_MICROCAP, VWAP_RECLAIM_MOMENTUM, and HIGH_CONVICTION_MULTI_FACTOR."
    )
    @McpTool("fetchStocksByAlgorithm")
    public List<Map<String, Object>> fetchStocksByAlgorithm(String date, DiscoveryAlgorithm algorithm, int limit) {
        return marketStreamService.fetchStocksByAlgorithm(
                date,
                algorithm != null ? algorithm.name() : DiscoveryAlgorithm.ALL.name(),
                limit
        );
    }

    @Tool(
            name = "getUnderneathTechnicalSnapshot",
            description = "Returns live price, day change %, 1H change %, VWAP, EMA-9, EMA-21, RSI-14, MACD, RVOL, float size, short borrow fee %, Level-1/Level-2 bid-ask spread, and intraday price series."
    )
    @McpTool("getUnderneathTechnicalSnapshot")
    public Map<String, Object> getUnderneathTechnicalSnapshot(String ticker) {
        return marketStreamService.getUnderneathTechnicalSnapshot(ticker);
    }

    @Tool(
            name = "getLiveSecFilingsAndCatalysts",
            description = "Queries live SEC EDGAR feeds and catalyst endpoints for 8-K catalysts, S-3 shelf registrations, ATM offerings, or warrant overhangs."
    )
    @McpTool("getLiveSecFilingsAndCatalysts")
    public SecFilingCatalystRecord getLiveSecFilingsAndCatalysts(String ticker) {
        return marketStreamService.getLiveSecFilingsAndCatalysts(ticker);
    }

    @Tool(
            name = "getLiveQuoteAndTechnicals",
            description = "Retrieves real-time price, VWAP, RSI-14, relative volume, short borrow fee rate, and float size from the live WebSocket/Redis market feed."
    )
    @McpTool("getLiveQuoteAndTechnicals")
    public LiveQuoteTechnicalsSnapshot getLiveQuoteAndTechnicals(String ticker) {
        return marketStreamService.getLiveQuoteAndTechnicals(ticker);
    }

    @Tool(
            name = "getLiveOrderBookDepth",
            description = "Retrieves live Level-2 order book bid/ask depth, spread bps, and order book imbalance ratio."
    )
    @McpTool("getLiveOrderBookDepth")
    public OrderBookDepthSnapshot getLiveOrderBookDepth(String ticker) {
        return marketStreamService.getLiveOrderBookDepth(ticker);
    }

    @Tool(
            name = "getRecentSecFilings",
            description = "Queries live SEC EDGAR submissions feed for dilution risk (S-3/ATM offerings, warrants) and recent material filings."
    )
    @McpTool("getRecentSecFilings")
    public SecFilingCatalystRecord getRecentSecFilings(String ticker) {
        return marketStreamService.getRecentSecFilings(ticker);
    }

    @Tool(
            name = "fetchTopMoversByWindow",
            description = "Fetches top market movers for the Day (1D) or Hour (1H) ranked by relative volume and momentum breakout from live market stream."
    )
    @McpTool("fetchTopMoversByWindow")
    public Map<String, Object> fetchTopMoversByWindow(
            String window,
            Double minRelativeVolume,
            Double minPrice,
            Long maxFloat) {
        String resolvedWindow = (window != null && window.trim().equalsIgnoreCase("1H")) ? "1H" : "1D";
        double minPriceThreshold = minPrice != null ? minPrice : 1.00;
        List<LiveQuoteTechnicalsSnapshot> allMovers = marketStreamService.fetchTopMarketMovers(resolvedWindow);
        List<LiveQuoteTechnicalsSnapshot> filtered = allMovers.stream()
                .filter(s -> s.lastPrice().doubleValue() >= minPriceThreshold)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("window", resolvedWindow);
        response.put("minRelativeVolume", minRelativeVolume != null ? minRelativeVolume : 2.5);
        response.put("minPrice", minPriceThreshold);
        response.put("maxFloat", maxFloat != null ? maxFloat : 50_000_000L);
        response.put("count", filtered.size());
        response.put("topMovers", filtered);
        response.put("fetchedAt", Instant.now().toString());
        return response;
    }
}
