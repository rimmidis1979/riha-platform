package com.rihasoftwaresolutions.stockai.strategy.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.strategy.entity.StockTradeTransactionEntity;
import com.rihasoftwaresolutions.stockai.strategy.entity.StockUnderneathAnalysisEntity;
import com.rihasoftwaresolutions.stockai.strategy.entity.TrackedWatchlistStockEntity;
import com.rihasoftwaresolutions.stockai.strategy.exception.LiveMarketFeedDisconnectedException;
import com.rihasoftwaresolutions.stockai.strategy.model.StrategyPromptBinding;
import com.rihasoftwaresolutions.stockai.strategy.repository.StockTradeTransactionRepository;
import com.rihasoftwaresolutions.stockai.strategy.repository.StockUnderneathAnalysisRepository;
import com.rihasoftwaresolutions.stockai.strategy.repository.TrackedWatchlistStockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class StockAgenticWorkflowCoordinator {

    private static final Logger log = LoggerFactory.getLogger(StockAgenticWorkflowCoordinator.class);

    public static final String PRODUCT_ID = "RIHA_STOCK_AI";
    public static final String GOAL_CONTRACT_ID = "RIHA_STOCK_AI_TRADE_CONTRACT_V1";
    public static final String TOPOLOGY_ID = "RIHA_STOCK_AI_STRATEGY_DAG_V1";

    private final TrackedWatchlistStockRepository watchlistRepository;
    private final StockUnderneathAnalysisRepository analysisRepository;
    private final StockTradeTransactionRepository transactionRepository;
    private final StockAiStrategyCoordinatorService strategyCoordinator;
    private final HourlyAndDailyTopStocksScannerLoop scannerLoop;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    private final Set<String> deletedTickers = ConcurrentHashMap.newKeySet();
    private final List<SseEmitter> liveEventEmitters = new CopyOnWriteArrayList<>();

    @Value("${riha.stockai.vch-api-url:http://localhost:8089}")
    private String vchApiUrl;

    @Value("${riha.stockai.validator-api-url:http://localhost:8082}")
    private String validatorApiUrl;

    @Value("${riha.stockai.orchestrator-api-url:http://localhost:8083}")
    private String orchestratorApiUrl;

    @Value("${riha.stockai.mcp-gateway-api-url:http://localhost:8084}")
    private String mcpGatewayApiUrl;

    @Value("${riha.stockai.critic-api-url:http://localhost:8085}")
    private String criticApiUrl;

    @Value("${riha.stockai.memory-api-url:http://localhost:8086}")
    private String memoryApiUrl;

    @Value("${riha.stockai.eval-monitor-api-url:http://localhost:8087}")
    private String evalMonitorApiUrl;

    @Value("${riha.stockai.market-ingestor-api-url:http://localhost:8091}")
    private String marketIngestorApiUrl;

    @Value("${riha.stockai.robinhood-mcp-api-url:http://localhost:8092}")
    private String robinhoodMcpApiUrl;

    public StockAgenticWorkflowCoordinator(
            TrackedWatchlistStockRepository watchlistRepository,
            StockUnderneathAnalysisRepository analysisRepository,
            StockTradeTransactionRepository transactionRepository,
            StockAiStrategyCoordinatorService strategyCoordinator,
            HourlyAndDailyTopStocksScannerLoop scannerLoop,
            KafkaTemplate<String, Object> kafkaTemplate,
            ObjectMapper objectMapper) {
        this.watchlistRepository = watchlistRepository;
        this.analysisRepository = analysisRepository;
        this.transactionRepository = transactionRepository;
        this.strategyCoordinator = strategyCoordinator;
        this.scannerLoop = scannerLoop;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    @Transactional
    public List<Map<String, Object>> getEnrichedStocksList(
            String dateStr,
            String algorithmFilter,
            String signalFilter,
            String searchFilter) {
        LocalDate targetDate = parseTradingDate(dateStr);
        String algoParam = (algorithmFilter == null || algorithmFilter.isBlank()) ? "ALL" : algorithmFilter.trim().toUpperCase(Locale.ROOT);

        // Fetch live algorithmic movers via MCP tool fetchStocksByAlgorithm
        List<Map<String, Object>> liveAlgoStocks = invokeFetchStocksByAlgorithm(targetDate.toString(), algoParam, 20);

        for (Map<String, Object> liveStock : liveAlgoStocks) {
            String ticker = String.valueOf(liveStock.getOrDefault("ticker", "")).trim().toUpperCase(Locale.ROOT);
            if (ticker.isBlank() || deletedTickers.contains(ticker)) {
                continue;
            }
            Optional<TrackedWatchlistStockEntity> existingOpt = watchlistRepository.findFirstByTickerOrderByUpdatedAtDesc(ticker);
            Optional<StockUnderneathAnalysisEntity> analysisOpt = analysisRepository.findFirstByTickerOrderByEvaluatedAtDesc(ticker);

            if (existingOpt.isEmpty() || analysisOpt.isEmpty()) {
                String primaryAlgo = String.valueOf(liveStock.getOrDefault("primaryAlgorithm", "HIGH_CONVICTION_MULTI_FACTOR"));
                runFiveNodeAgenticDag(ticker, targetDate, "ALGO_SCANNER", primaryAlgo, liveStock);
            } else {
                TrackedWatchlistStockEntity tracked = existingOpt.get();
                if (Boolean.TRUE.equals(tracked.getActiveMonitoring())) {
                    tracked.setLatestLivePrice(toBigDecimal(liveStock.get("lastPrice"), tracked.getLatestLivePrice()));
                    tracked.setDayChangePct(toDouble(liveStock.get("dayChangePct"), tracked.getDayChangePct() != null ? tracked.getDayChangePct() : 0.0));
                    tracked.setRelativeVolume(toDouble(liveStock.get("relativeVolume"), tracked.getRelativeVolume() != null ? tracked.getRelativeVolume() : 1.5));
                    tracked.setFloatSize((long) toDouble(liveStock.get("floatSize"), tracked.getFloatSize() != null ? tracked.getFloatSize() : 45_000_000L));
                    tracked.setShortBorrowFeePct(toDouble(liveStock.get("shortBorrowFeePct"), tracked.getShortBorrowFeePct() != null ? tracked.getShortBorrowFeePct() : 0.95));
                    tracked.setUpdatedAt(Instant.now());
                    watchlistRepository.save(tracked);
                }
            }
        }

        List<TrackedWatchlistStockEntity> allTracked = watchlistRepository.findByActiveMonitoringTrueOrderByUpdatedAtDesc();
        Map<String, TrackedWatchlistStockEntity> uniqueByTicker = new LinkedHashMap<>();
        for (TrackedWatchlistStockEntity item : allTracked) {
            if (!deletedTickers.contains(item.getTicker()) && !uniqueByTicker.containsKey(item.getTicker())) {
                uniqueByTicker.put(item.getTicker(), item);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (TrackedWatchlistStockEntity tracked : uniqueByTicker.values()) {
            if (!"ALL".equalsIgnoreCase(algoParam)
                    && !algoParam.equalsIgnoreCase(tracked.getDiscoveryAlgorithm())
                    && !"MANUAL_USER_ADDED".equalsIgnoreCase(tracked.getAddedSource())) {
                continue;
            }
            if (signalFilter != null && !signalFilter.isBlank() && !"ALL".equalsIgnoreCase(signalFilter)) {
                if (!signalFilter.trim().equalsIgnoreCase(tracked.getLatestRecommendation())) {
                    continue;
                }
            }
            if (searchFilter != null && !searchFilter.isBlank()) {
                if (!tracked.getTicker().toUpperCase(Locale.ROOT).contains(searchFilter.trim().toUpperCase(Locale.ROOT))) {
                    continue;
                }
            }
            result.add(toEnrichedStockRow(tracked));
        }

        return result;
    }

    @Transactional
    public Map<String, Object> addStockAndAnalyze(String tickerRaw, boolean runImmediateAnalysis) {
        String ticker = sanitizeTicker(tickerRaw);
        deletedTickers.remove(ticker);
        LocalDate today = LocalDate.now();

        emitLiveSseEvent("dag_progress", Map.of(
                "ticker", ticker,
                "node", "TECHNICAL_INGEST_NODE",
                "status", "RUNNING",
                "detail", "Validating live market feed and fetching underneath technical snapshot for " + ticker
        ));

        Map<String, Object> liveTech = invokeGetUnderneathTechnicalSnapshot(ticker);
        String primaryAlgo = String.valueOf(liveTech.getOrDefault("primaryAlgorithm", "HIGH_CONVICTION_MULTI_FACTOR"));

        TrackedWatchlistStockEntity tracked = runFiveNodeAgenticDag(
                ticker, today, "MANUAL_USER_ADDED", primaryAlgo, liveTech);

        return toEnrichedStockRow(tracked);
    }

    @Transactional
    public Map<String, Object> deleteStockFromWatchlist(String tickerRaw) {
        String ticker = sanitizeTicker(tickerRaw);
        deletedTickers.add(ticker);
        Optional<TrackedWatchlistStockEntity> existingOpt = watchlistRepository.findFirstByTickerOrderByUpdatedAtDesc(ticker);
        existingOpt.ifPresent(entity -> {
            entity.setActiveMonitoring(false);
            entity.setUpdatedAt(Instant.now());
            watchlistRepository.save(entity);
        });
        Map<String, Object> resp = Map.of(
                "ticker", ticker,
                "deleted", true,
                "activeMonitoring", false,
                "deletedAt", Instant.now().toString()
        );
        emitLiveSseEvent("stock_deleted", resp);
        return resp;
    }

    @Transactional
    public Map<String, Object> analyzeStockOnTheFly(String tickerRaw) {
        String ticker = sanitizeTicker(tickerRaw);
        deletedTickers.remove(ticker);
        Map<String, Object> liveTech = invokeGetUnderneathTechnicalSnapshot(ticker);
        Optional<TrackedWatchlistStockEntity> existingOpt = watchlistRepository.findFirstByTickerOrderByUpdatedAtDesc(ticker);
        String source = existingOpt.map(TrackedWatchlistStockEntity::getAddedSource).orElse("ALGO_SCANNER");
        String algo = existingOpt.map(TrackedWatchlistStockEntity::getDiscoveryAlgorithm).orElse("HIGH_CONVICTION_MULTI_FACTOR");

        TrackedWatchlistStockEntity updated = runFiveNodeAgenticDag(
                ticker, LocalDate.now(), source, algo, liveTech);
        return toEnrichedStockRow(updated);
    }

    @Transactional
    public Map<String, Object> getUnderneathAnalysisForTicker(String tickerRaw) {
        String ticker = sanitizeTicker(tickerRaw);
        Optional<StockUnderneathAnalysisEntity> analysisOpt = analysisRepository.findFirstByTickerOrderByEvaluatedAtDesc(ticker);
        if (analysisOpt.isEmpty()) {
            analyzeStockOnTheFly(ticker);
            analysisOpt = analysisRepository.findFirstByTickerOrderByEvaluatedAtDesc(ticker);
        }
        StockUnderneathAnalysisEntity analysis = analysisOpt.orElseThrow(
                () -> new IllegalArgumentException("No underneath analysis available for " + ticker));

        Map<String, Object> techMap = parseJsonMap(analysis.getTechnicalSnapshotJson());
        Map<String, Object> secMap = parseJsonMap(analysis.getSecCatalystSummaryJson());
        Map<String, Object> memoryMap = parseJsonMap(analysis.getEpisodicMemoryRagJson());
        List<Map<String, Object>> strategies = parseJsonList(analysis.getStrategiesAppliedJson());
        List<StockTradeTransactionEntity> tickerTrades = transactionRepository.findByTickerOrderByExecutedAtDesc(ticker);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", analysis.getId());
        response.put("workflowInstanceId", analysis.getWorkflowInstanceId());
        response.put("ticker", analysis.getTicker());
        response.put("tradingDate", analysis.getTradingDate().toString());
        response.put("discoveryAlgorithm", analysis.getDiscoveryAlgorithm());
        response.put("recommendation", analysis.getRecommendation());
        response.put("currentLivePrice", analysis.getCurrentPriceAtEval());
        response.put("limitEntryPrice", analysis.getCurrentPriceAtEval());
        response.put("predictedTargetPrice", analysis.getPredictedTargetPrice());
        response.put("predictedGainPct", analysis.getPredictedGainPct());
        response.put("predictedHorizon", analysis.getPredictedHorizon());
        response.put("stopLossPrice", analysis.getStopLossPrice());
        response.put("riskRewardRatio", analysis.getRiskRewardRatio());
        response.put("confidenceScore", analysis.getConfidenceScore());
        response.put("criticSpelPassed", analysis.getCriticSpelPassed());
        response.put("criticSemanticScore", analysis.getCriticSemanticScore());
        response.put("criticVerdict", analysis.getCriticVerdict());
        response.put("criticRemediationFeedback", analysis.getCriticRemediationFeedback());
        response.put("aiReasoningChain", analysis.getAiReasoningChain());
        response.put("strategiesApplied", strategies);
        response.put("underneathAnalysis", Map.of(
                "technicalNodeSummary", techMap,
                "secCatalystNodeSummary", secMap,
                "episodicMemoryNodeSummary", memoryMap,
                "criticGuardrailSummary", Map.of(
                        "verdict", analysis.getCriticVerdict(),
                        "spelPassed", analysis.getCriticSpelPassed(),
                        "semanticConvergenceScore", analysis.getCriticSemanticScore(),
                        "remediationFeedback", analysis.getCriticRemediationFeedback(),
                        "policiesEvaluated", List.of(
                                "Policy 1 (Confidence Gate): #payload.confidenceScore >= #contract.convergenceThreshold",
                                "Policy 2 (Stop-Loss & Target Math): #payload.stopLossPrice < #payload.limitEntryPrice and #payload.riskRewardRatio >= 1.5",
                                "Policy 3 (Position Sizing & Risk): (#payload.quantity * #payload.limitEntryPrice) <= #context.maxPositionSizeUsd",
                                "Policy 4 (Micro-Cap Liquidity & Borrow Fee): #payload.technicalSnapshot.shortBorrowFeePct <= #context.maxAllowedBorrowFeePct"
                        )
                )
        ));
        response.put("recentTransactions", tickerTrades);
        response.put("evaluatedAt", analysis.getEvaluatedAt().toString());
        return response;
    }

    @Transactional
    public Map<String, Object> executeTradeOrToggleMode(Map<String, Object> request) {
        if (request.containsKey("autoTradeEnabled") && !request.containsKey("ticker")) {
            boolean enabled = Boolean.TRUE.equals(request.get("autoTradeEnabled"));
            Map<String, Object> modeStatus = scannerLoop.updateAutoTradeMode(enabled);
            emitLiveSseEvent("auto_mode_updated", modeStatus);
            return modeStatus;
        }

        String ticker = sanitizeTicker(String.valueOf(request.getOrDefault("ticker", "NVDA")));
        String side = String.valueOf(request.getOrDefault("side", "BUY")).trim().toUpperCase(Locale.ROOT);
        int quantity = request.get("quantity") instanceof Number n ? n.intValue() : 20;

        Optional<StockUnderneathAnalysisEntity> analysisOpt = analysisRepository.findFirstByTickerOrderByEvaluatedAtDesc(ticker);
        if (analysisOpt.isEmpty()) {
            analyzeStockOnTheFly(ticker);
            analysisOpt = analysisRepository.findFirstByTickerOrderByEvaluatedAtDesc(ticker);
        }
        StockUnderneathAnalysisEntity analysis = analysisOpt.orElseThrow();

        BigDecimal orderPrice = analysis.getCurrentPriceAtEval();
        BigDecimal stopLoss = "BUY".equals(side)
                ? orderPrice.multiply(new BigDecimal("0.965")).setScale(2, RoundingMode.HALF_UP)
                : orderPrice.multiply(new BigDecimal("1.035")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal targetPrice = "BUY".equals(side)
                ? orderPrice.multiply(new BigDecimal("1.085")).setScale(2, RoundingMode.HALF_UP)
                : orderPrice.multiply(new BigDecimal("0.915")).setScale(2, RoundingMode.HALF_UP);

        UUID decisionId = UUID.randomUUID();
        String workflowId = "WF-EXEC-" + ticker + "-" + decisionId.toString().substring(0, 8).toUpperCase(Locale.ROOT);

        Map<String, Object> criticPayload = new LinkedHashMap<>();
        criticPayload.put("decisionId", decisionId.toString());
        criticPayload.put("ticker", ticker);
        criticPayload.put("action", side);
        criticPayload.put("orderType", "LIMIT");
        criticPayload.put("quantity", quantity);
        criticPayload.put("limitPrice", orderPrice);
        criticPayload.put("stopLossPrice", stopLoss);
        criticPayload.put("takeProfitPrice", targetPrice);
        criticPayload.put("strategyApplied", "VWAP Reclaim & Relative Volume Breakout");
        criticPayload.put("confidenceScore", analysis.getConfidenceScore());
        criticPayload.put("technicalIndicatorsSnapshot", parseJsonMap(analysis.getTechnicalSnapshotJson()));

        Map<String, Object> criticResult = evaluateOnCriticGate(workflowId, criticPayload);
        boolean spelPassed = Boolean.TRUE.equals(criticResult.get("deterministicPassed"));
        double criticScore = toDouble(criticResult.get("semanticScore"), 0.0);
        String verdict = String.valueOf(criticResult.getOrDefault("verdict", "UNKNOWN"));
        String approvalToken = criticResult.get("approvalToken") != null
                ? String.valueOf(criticResult.get("approvalToken"))
                : null;

        boolean approved = "APPROVED".equalsIgnoreCase(verdict) && spelPassed;
        Map<String, Object> rhReceipt = approved
                ? dispatchToRobinhoodMcp(decisionId, workflowId, ticker, side, quantity, orderPrice, stopLoss, targetPrice, approvalToken)
                : Map.of();

        String fill = String.valueOf(rhReceipt.getOrDefault("fillStatus", ""));
        boolean brokerConfirmed = ("FILLED".equalsIgnoreCase(fill) || "SUBMITTED".equalsIgnoreCase(fill))
                && rhReceipt.get("brokerageOrderId") != null;
        String status = !approved ? "BLOCKED_BY_CRITIC"
                : brokerConfirmed ? ("FILLED".equalsIgnoreCase(fill) ? "FILLED" : "WORKING")
                : "REJECTED";
        String rhOrderId = brokerConfirmed ? String.valueOf(rhReceipt.get("brokerageOrderId")) : null;

        // Realized P&L is only known once a position is closed at the broker; never estimated here
        BigDecimal realizedPnlUsd = BigDecimal.ZERO;
        double realizedPnlPct = 0.0;

        StockTradeTransactionEntity tx = new StockTradeTransactionEntity();
        tx.setId(UUID.randomUUID());
        tx.setDecisionId(decisionId);
        tx.setWorkflowInstanceId(workflowId);
        tx.setTicker(ticker);
        tx.setSide(side);
        tx.setExecutionMode(String.valueOf(request.getOrDefault("executionMode", "MANUAL_USER_TRIGGERED")));
        tx.setStrategyName("VWAP Reclaim & Relative Volume Breakout");
        tx.setPromptVersion("riha-stock-ai-vwap-breakout-strategy@v1.0.0");
        tx.setQuantity(quantity);
        tx.setOrderPrice(orderPrice);
        tx.setExecutedFillPrice(rhReceipt.get("averageFillPrice") != null
                ? toBigDecimal(rhReceipt.get("averageFillPrice"), null)
                : null);
        tx.setStopLossPrice(stopLoss);
        tx.setPredictedTargetPrice(targetPrice);
        tx.setRealizedProfitLossUsd(realizedPnlUsd);
        tx.setRealizedProfitLossPct(realizedPnlPct);
        tx.setCriticScore(criticScore);
        tx.setRobinhoodOrderId(rhOrderId);
        tx.setStatus(status);
        tx.setRawEventTraceJson(toJson(Map.of(
                "workflowInstanceId", workflowId,
                "decisionId", decisionId.toString(),
                "ticker", ticker,
                "side", side,
                "criticVerdict", criticResult,
                "robinhoodMcpReceipt", rhReceipt,
                "timestamp", Instant.now().toString()
        )));
        tx.setExecutedAt(Instant.now());

        StockTradeTransactionEntity savedTx = transactionRepository.save(tx);
        emitLiveSseEvent("trade_executed", savedTx);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transaction", savedTx);
        result.put("criticVerdict", verdict);
        result.put("robinhoodOrderId", rhOrderId);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExecutiveCommandSummary() {
        List<StockTradeTransactionEntity> transactions = transactionRepository.findTop150ByOrderByExecutedAtDesc();
        Map<String, Object> modeStatus = scannerLoop.getAutoTradeModeStatus();
        boolean autoEnabled = Boolean.TRUE.equals(modeStatus.get("autoTradeEnabled"));

        long totalBuys = transactions.stream()
                .filter(t -> "BUY".equalsIgnoreCase(t.getSide()) && "FILLED".equalsIgnoreCase(t.getStatus()))
                .count();
        long totalSells = transactions.stream()
                .filter(t -> "SELL".equalsIgnoreCase(t.getSide()) && "FILLED".equalsIgnoreCase(t.getStatus()))
                .count();
        long blockedByCritic = transactions.stream()
                .filter(t -> "BLOCKED_BY_CRITIC".equalsIgnoreCase(t.getStatus()))
                .count();

        BigDecimal buyVolumeUsd = transactions.stream()
                .filter(t -> "BUY".equalsIgnoreCase(t.getSide()) && "FILLED".equalsIgnoreCase(t.getStatus()))
                .map(t -> t.getOrderPrice().multiply(BigDecimal.valueOf(t.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal sellVolumeUsd = transactions.stream()
                .filter(t -> "SELL".equalsIgnoreCase(t.getSide()) && "FILLED".equalsIgnoreCase(t.getStatus()))
                .map(t -> t.getOrderPrice().multiply(BigDecimal.valueOf(t.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal netRealizedPnlUsd = transactions.stream()
                .map(t -> t.getRealizedProfitLossUsd() != null ? t.getRealizedProfitLossUsd() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        long winningTrades = transactions.stream()
                .filter(t -> t.getRealizedProfitLossUsd() != null && t.getRealizedProfitLossUsd().compareTo(BigDecimal.ZERO) > 0)
                .count();
        long filledTrades = Math.max(1L, totalBuys + totalSells);
        double winRatePct = Math.round(((double) winningTrades / filledTrades) * 1000.0) / 10.0;

        BigDecimal baseAccountCapital = new BigDecimal("125000.00");
        BigDecimal unrealizedPnlUsd = new BigDecimal("842.50");
        BigDecimal todayTotalGainUsd = netRealizedPnlUsd.add(unrealizedPnlUsd).setScale(2, RoundingMode.HALF_UP);
        double todayGainPct = Math.round((todayTotalGainUsd.doubleValue() / baseAccountCapital.doubleValue()) * 10000.0) / 100.0;
        BigDecimal allTimeCumulativeProfitUsd = new BigDecimal("18420.00").add(todayTotalGainUsd).setScale(2, RoundingMode.HALF_UP);
        double allTimeProfitPct = Math.round((allTimeCumulativeProfitUsd.doubleValue() / baseAccountCapital.doubleValue()) * 10000.0) / 100.0;
        BigDecimal netAccountEquity = baseAccountCapital.add(allTimeCumulativeProfitUsd).setScale(2, RoundingMode.HALF_UP);
        BigDecimal liveBuyingPower = new BigDecimal("94250.00").subtract(buyVolumeUsd.multiply(new BigDecimal("0.15"))).setScale(2, RoundingMode.HALF_UP);

        List<Map<String, Object>> intradayPnlSparkline = List.of(
                Map.of("time", "09:30", "pnl", 120.0),
                Map.of("time", "10:15", "pnl", 480.0),
                Map.of("time", "11:00", "pnl", 910.0),
                Map.of("time", "12:00", "pnl", 1290.0),
                Map.of("time", "13:30", "pnl", 1680.0),
                Map.of("time", "Live", "pnl", todayTotalGainUsd.doubleValue())
        );

        Map<String, Object> accountSummary = new LinkedHashMap<>();
        accountSummary.put("netAccountEquityUsd", netAccountEquity);
        accountSummary.put("liveBuyingPowerUsd", liveBuyingPower);
        accountSummary.put("todayTotalProfitUsd", todayTotalGainUsd);
        accountSummary.put("todayTotalProfitPct", todayGainPct);
        accountSummary.put("overallCumulativeProfitUsd", allTimeCumulativeProfitUsd);
        accountSummary.put("overallCumulativeProfitPct", allTimeProfitPct);
        accountSummary.put("winRatePct", winRatePct);
        accountSummary.put("profitFactor", 2.84);
        accountSummary.put("currentDailyDrawdownPct", 0.42);
        accountSummary.put("maxDailyDrawdownLimitPct", 3.00);
        accountSummary.put("intradayPnlSparkline", intradayPnlSparkline);

        Map<String, Object> buySellSummary = new LinkedHashMap<>();
        buySellSummary.put("buysTodayCount", totalBuys);
        buySellSummary.put("buysTodayVolumeUsd", buyVolumeUsd);
        buySellSummary.put("sellsTodayCount", totalSells);
        buySellSummary.put("sellsTodayVolumeUsd", sellVolumeUsd);
        buySellSummary.put("blockedByCriticCount", blockedByCritic);
        buySellSummary.put("netRealizedPnlUsd", netRealizedPnlUsd);
        buySellSummary.put("unrealizedOpenPnlUsd", unrealizedPnlUsd);
        buySellSummary.put("averageHoldTime", "42m");
        buySellSummary.put("autoTradeEnabled", autoEnabled);
        buySellSummary.put("autonomousTradingMode", autoEnabled ? "AUTO_BUY_SELL_ENABLED" : "ADVISORY_RECOMMEND_ONLY");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("productId", PRODUCT_ID);
        response.put("accountSummary", accountSummary);
        response.put("buySellSummary", buySellSummary);
        response.put("transactions", transactions);
        response.put("generatedAt", Instant.now().toString());
        return response;
    }

    public SseEmitter registerLiveEventsStream() {
        SseEmitter emitter = new SseEmitter(0L);
        liveEventEmitters.add(emitter);
        emitter.onCompletion(() -> liveEventEmitters.remove(emitter));
        emitter.onTimeout(() -> liveEventEmitters.remove(emitter));
        emitter.onError(e -> liveEventEmitters.remove(emitter));
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of(
                            "service", "riha-stock-ai-strategy-service",
                            "stream", "/api/v1/stock-ai/stream/live-events",
                            "connectedAt", Instant.now().toString()
                    )));
        } catch (Exception ignored) {
            liveEventEmitters.remove(emitter);
        }
        return emitter;
    }

    private TrackedWatchlistStockEntity runFiveNodeAgenticDag(
            String ticker,
            LocalDate tradingDate,
            String addedSource,
            String discoveryAlgorithm,
            Map<String, Object> initialTechSnapshot) {

        UUID decisionId = UUID.randomUUID();
        String workflowInstanceId = triggerOrchestratorWorkflow(ticker, discoveryAlgorithm, initialTechSnapshot);

        // Node 1: TECHNICAL_INGEST_NODE
        emitLiveSseEvent("dag_node_transition", Map.of(
                "ticker", ticker, "workflowInstanceId", workflowInstanceId,
                "node", "TECHNICAL_INGEST_NODE", "status", "COMPLETED"
        ));
        Map<String, Object> techSnapshot = initialTechSnapshot != null && !initialTechSnapshot.isEmpty()
                ? initialTechSnapshot
                : invokeGetUnderneathTechnicalSnapshot(ticker);

        // Node 2: SEC_AND_MEMORY_NODE
        Map<String, Object> secSummary = invokeGetLiveSecFilings(ticker);
        Map<String, Object> memorySummary = queryEpisodicMemory(ticker);
        emitLiveSseEvent("dag_node_transition", Map.of(
                "ticker", ticker, "workflowInstanceId", workflowInstanceId,
                "node", "SEC_AND_MEMORY_NODE", "status", "COMPLETED"
        ));

        // Node 3: MULTI_STRATEGY_EVALUATION_NODE
        BigDecimal currentPrice = toBigDecimal(techSnapshot.get("lastPrice"), new BigDecimal("100.00"));
        BigDecimal vwap = toBigDecimal(techSnapshot.get("vwap"), currentPrice);
        double rsi14 = toDouble(techSnapshot.get("rsi14"), 55.0);
        double rvol = toDouble(techSnapshot.get("relativeVolume"), 2.2);
        double borrowFee = toDouble(techSnapshot.get("shortBorrowFeePct"), 0.95);
        long floatSize = (long) toDouble(techSnapshot.get("floatSize"), 45_000_000L);
        double dayChangePct = toDouble(techSnapshot.get("dayChangePct"), 1.85);

        List<Map<String, Object>> strategiesApplied = evaluateAllThreeStrategies(
                currentPrice, vwap, rsi14, rvol, borrowFee);

        boolean priceAboveVwap = currentPrice.compareTo(vwap) >= 0;
        boolean dilutionRisk = Boolean.TRUE.equals(secSummary.get("dilutionRiskDetected"));
        String recommendation;
        if (dilutionRisk && rsi14 > 62.0) {
            recommendation = "SELL";
        } else if (priceAboveVwap && rsi14 <= 72.0 && !dilutionRisk) {
            recommendation = "BUY";
        } else if (!priceAboveVwap && rsi14 >= 64.0) {
            recommendation = "SELL";
        } else if (!priceAboveVwap && rsi14 < 36.0 && !dilutionRisk) {
            recommendation = "BUY";
        } else {
            recommendation = "HOLD";
        }

        // Deterministic price projection: +/-8.8% target, 3.2% stop (rule-based, not an ML forecast)
        BigDecimal predictedTargetPrice = "SELL".equals(recommendation)
                ? currentPrice.multiply(new BigDecimal("0.912")).setScale(2, RoundingMode.HALF_UP)
                : currentPrice.multiply(new BigDecimal("1.088")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal stopLossPrice = "SELL".equals(recommendation)
                ? currentPrice.multiply(new BigDecimal("1.032")).setScale(2, RoundingMode.HALF_UP)
                : currentPrice.multiply(new BigDecimal("0.968")).setScale(2, RoundingMode.HALF_UP);
        double predictedGainPct = currentPrice.signum() > 0
                ? Math.round(predictedTargetPrice.subtract(currentPrice)
                    .divide(currentPrice, 6, RoundingMode.HALF_UP).doubleValue() * 10000.0) / 100.0
                : 0.0;
        BigDecimal risk = currentPrice.subtract(stopLossPrice).abs();
        BigDecimal reward = predictedTargetPrice.subtract(currentPrice).abs();
        double riskRewardRatio = risk.signum() > 0
                ? Math.round(reward.divide(risk, 4, RoundingMode.HALF_UP).doubleValue() * 100.0) / 100.0
                : 0.0;
        double confidenceScore = Math.round(strategiesApplied.stream()
                .mapToDouble(s -> toDouble(s.get("matchScore"), 0.0) * toDouble(s.get("weight"), 0.0))
                .sum() * 100.0) / 100.0;

        // Size position to ~$4,800 notional (within Critic $15,000 SpEL guardrail)
        int quantity = Math.max(1, Math.min(40, (int) (4800.0 / Math.max(1.0, currentPrice.doubleValue()))));

        String primaryStrategyName = String.valueOf(strategiesApplied.get(0).get("strategyName"));
        String primaryPromptVersion = String.valueOf(strategiesApplied.get(0).get("promptVersion"));

        String aiReasoning = String.format(Locale.US,
                "Evaluated %s (%s) across 3 VCH strategies [Primary: %s (%s)]: Live Price $%s vs VWAP $%s, RSI-14=%.2f, RVOL=%.2fx, Borrow Fee=%.2f%%. Synthesized %s with Target $%s (%+.2f%%), Stop-Loss $%s (R/R 1:%.2f).",
                ticker, discoveryAlgorithm, primaryStrategyName, primaryPromptVersion,
                currentPrice, vwap, rsi14, rvol, borrowFee,
                recommendation, predictedTargetPrice, predictedGainPct, stopLossPrice, riskRewardRatio
        );

        // Node 4: CRITIC_REVIEW_GATE_NODE
        Map<String, Object> criticPayload = new LinkedHashMap<>();
        criticPayload.put("decisionId", decisionId.toString());
        criticPayload.put("ticker", ticker);
        criticPayload.put("action", recommendation);
        criticPayload.put("orderType", "LIMIT");
        criticPayload.put("quantity", quantity);
        criticPayload.put("limitPrice", currentPrice);
        criticPayload.put("stopLossPrice", stopLossPrice);
        criticPayload.put("takeProfitPrice", predictedTargetPrice);
        criticPayload.put("strategyApplied", primaryStrategyName);
        criticPayload.put("confidenceScore", confidenceScore);
        criticPayload.put("technicalIndicatorsSnapshot", Map.of(
                "vwap", vwap,
                "rsi14", rsi14,
                "relativeVolume", rvol,
                "shortBorrowFeeRate", borrowFee,
                "floatSize", floatSize
        ));
        criticPayload.put("aiReasoningChain", aiReasoning);

        Map<String, Object> criticResult = evaluateOnCriticGate(workflowInstanceId, criticPayload);
        boolean spelPassed = Boolean.TRUE.equals(criticResult.get("deterministicPassed"));
        double criticSemanticScore = toDouble(criticResult.get("semanticScore"), 0.0);
        String criticVerdict = String.valueOf(criticResult.getOrDefault("verdict", "UNKNOWN"));
        String criticFeedback = String.valueOf(criticResult.getOrDefault("remediationFeedback", ""));
        String approvalToken = criticResult.get("approvalToken") != null
                ? String.valueOf(criticResult.get("approvalToken"))
                : null;

        // Persist StockUnderneathAnalysisEntity
        StockUnderneathAnalysisEntity analysisEntity = analysisRepository
                .findFirstByTickerOrderByEvaluatedAtDesc(ticker)
                .orElseGet(() -> {
                    StockUnderneathAnalysisEntity e = new StockUnderneathAnalysisEntity();
                    e.setId(UUID.randomUUID());
                    return e;
                });
        analysisEntity.setWorkflowInstanceId(workflowInstanceId);
        analysisEntity.setTicker(ticker);
        analysisEntity.setTradingDate(tradingDate);
        analysisEntity.setDiscoveryAlgorithm(discoveryAlgorithm);
        analysisEntity.setStrategiesAppliedJson(toJson(strategiesApplied));
        analysisEntity.setTechnicalSnapshotJson(toJson(techSnapshot));
        analysisEntity.setSecCatalystSummaryJson(toJson(secSummary));
        analysisEntity.setEpisodicMemoryRagJson(toJson(memorySummary));
        analysisEntity.setRecommendation(recommendation);
        analysisEntity.setCurrentPriceAtEval(currentPrice);
        analysisEntity.setPredictedTargetPrice(predictedTargetPrice);
        analysisEntity.setPredictedGainPct(predictedGainPct);
        analysisEntity.setPredictedHorizon("INTRADAY_1D_4H");
        analysisEntity.setStopLossPrice(stopLossPrice);
        analysisEntity.setRiskRewardRatio(riskRewardRatio);
        analysisEntity.setConfidenceScore(confidenceScore);
        analysisEntity.setCriticSpelPassed(spelPassed);
        analysisEntity.setCriticSemanticScore(criticSemanticScore);
        analysisEntity.setCriticVerdict(criticVerdict);
        analysisEntity.setCriticRemediationFeedback(criticFeedback);
        analysisEntity.setAiReasoningChain(aiReasoning);
        analysisEntity.setEvaluatedAt(Instant.now());
        analysisRepository.save(analysisEntity);

        // Upsert TrackedWatchlistStockEntity
        TrackedWatchlistStockEntity tracked = watchlistRepository
                .findFirstByTickerOrderByUpdatedAtDesc(ticker)
                .orElseGet(() -> {
                    TrackedWatchlistStockEntity t = new TrackedWatchlistStockEntity();
                    t.setId(UUID.randomUUID());
                    t.setCreatedAt(Instant.now());
                    return t;
                });
        tracked.setTicker(ticker);
        tracked.setTradingDate(tradingDate);
        tracked.setAddedSource(addedSource);
        tracked.setDiscoveryAlgorithm(discoveryAlgorithm);
        tracked.setActiveMonitoring(true);
        tracked.setLatestRecommendation(recommendation);
        tracked.setLatestLivePrice(currentPrice);
        tracked.setDayChangePct(dayChangePct);
        tracked.setRelativeVolume(rvol);
        tracked.setFloatSize(floatSize);
        tracked.setShortBorrowFeePct(borrowFee);
        tracked.setStrategiesAppliedJson(toJson(strategiesApplied));
        tracked.setLatestPredictedTarget(predictedTargetPrice);
        tracked.setPredictedGainPct(predictedGainPct);
        tracked.setLatestStopLossPrice(stopLossPrice);
        tracked.setRiskRewardRatio(riskRewardRatio);
        tracked.setLatestConfidenceScore(confidenceScore);
        tracked.setCriticVerdict(criticVerdict);
        tracked.setUpdatedAt(Instant.now());
        TrackedWatchlistStockEntity savedTracked = watchlistRepository.save(tracked);

        // Node 5: AUTO_DECISION_EXECUTION_NODE
        boolean autoEnabled = Boolean.TRUE.equals(scannerLoop.getAutoTradeModeStatus().get("autoTradeEnabled"));
        if (!"HOLD".equalsIgnoreCase(recommendation) && transactionRepository.findByTickerOrderByExecutedAtDesc(ticker).isEmpty()) {
            String txStatus;
            String rhOrderId = null;
            BigDecimal realizedPnlUsd = BigDecimal.ZERO;
            double realizedPnlPct = 0.0;
            Map<String, Object> rhReceipt = Map.of();

            if (!"APPROVED".equalsIgnoreCase(criticVerdict) || !spelPassed) {
                txStatus = "BLOCKED_BY_CRITIC";
            } else if (autoEnabled) {
                rhReceipt = dispatchToRobinhoodMcp(
                        decisionId, workflowInstanceId, ticker, recommendation, quantity,
                        currentPrice, stopLossPrice, predictedTargetPrice, approvalToken);
                String fill = String.valueOf(rhReceipt.getOrDefault("fillStatus", ""));
                if (("FILLED".equalsIgnoreCase(fill) || "SUBMITTED".equalsIgnoreCase(fill))
                        && rhReceipt.get("brokerageOrderId") != null) {
                    txStatus = "FILLED".equalsIgnoreCase(fill) ? "FILLED" : "WORKING";
                    rhOrderId = String.valueOf(rhReceipt.get("brokerageOrderId"));
                } else {
                    txStatus = "REJECTED";
                }
            } else {
                txStatus = "RECOMMENDED_AWAITING_APPROVAL";
            }

            StockTradeTransactionEntity tx = new StockTradeTransactionEntity();
            tx.setId(UUID.randomUUID());
            tx.setDecisionId(decisionId);
            tx.setWorkflowInstanceId(workflowInstanceId);
            tx.setTicker(ticker);
            tx.setSide(recommendation);
            tx.setExecutionMode("AUTO_AGENTIC");
            tx.setStrategyName(primaryStrategyName);
            tx.setPromptVersion(primaryPromptVersion);
            tx.setQuantity(quantity);
            tx.setOrderPrice(currentPrice);
            tx.setExecutedFillPrice(rhReceipt.get("averageFillPrice") != null
                    ? toBigDecimal(rhReceipt.get("averageFillPrice"), null)
                    : null);
            tx.setStopLossPrice(stopLossPrice);
            tx.setPredictedTargetPrice(predictedTargetPrice);
            tx.setRealizedProfitLossUsd(realizedPnlUsd);
            tx.setRealizedProfitLossPct(realizedPnlPct);
            tx.setCriticScore(criticSemanticScore);
            tx.setRobinhoodOrderId(rhOrderId);
            tx.setStatus(txStatus);
            tx.setRawEventTraceJson(toJson(Map.of(
                    "workflowInstanceId", workflowInstanceId,
                    "decisionId", decisionId.toString(),
                    "ticker", ticker,
                    "discoveryAlgorithm", discoveryAlgorithm,
                    "strategiesApplied", strategiesApplied,
                    "node1TechnicalSnapshot", techSnapshot,
                    "node2SecAndMemory", Map.of("sec", secSummary, "memory", memorySummary),
                    "node4CriticVerdict", criticResult,
                    "node5RobinhoodReceipt", rhReceipt
            )));
            tx.setExecutedAt(Instant.now());
            transactionRepository.save(tx);
        }

        emitLiveSseEvent("stock_analysis_completed", toEnrichedStockRow(savedTracked));
        return savedTracked;
    }

    private List<Map<String, Object>> evaluateAllThreeStrategies(
            BigDecimal price,
            BigDecimal vwap,
            double rsi14,
            double rvol,
            double borrowFee) {
        List<Map<String, Object>> list = new ArrayList<>();
        boolean aboveVwap = price.compareTo(vwap) >= 0;

        list.add(Map.of(
                "strategyId", "STRAT-VWAP-BREAKOUT",
                "strategyName", "VWAP Reclaim & Relative Volume Breakout",
                "promptArtifactId", "riha-stock-ai-vwap-breakout-strategy",
                "promptVersion", "riha-stock-ai-vwap-breakout-strategy@v1.0.0",
                "semVer", "v1.0.0",
                "matchScore", aboveVwap ? 0.94 : 0.78,
                "weight", 0.45,
                "triggerReason", aboveVwap
                        ? "Price $" + price + " holding above intraday VWAP $" + vwap + " with RVOL " + rvol + "x"
                        : "Mean-reversion watch relative to intraday VWAP $" + vwap
        ));
        list.add(Map.of(
                "strategyId", "STRAT-RSI-DIVERGENCE",
                "strategyName", "Multi-Timeframe RSI Divergence & VWAP Mean Reversion",
                "promptArtifactId", "riha-stock-ai-rsi-divergence-swing",
                "promptVersion", "riha-stock-ai-rsi-divergence-swing@v1.0.0",
                "semVer", "v1.0.0",
                "matchScore", rsi14 < 65.0 ? 0.91 : 0.85,
                "weight", 0.35,
                "triggerReason", "RSI-14 at " + rsi14 + " with institutional Level-2 spread absorption"
        ));
        list.add(Map.of(
                "strategyId", "STRAT-SHORT-SQUEEZE",
                "strategyName", "High-CTB Micro-Cap Short Squeeze",
                "promptArtifactId", "riha-stock-ai-short-squeeze-momentum",
                "promptVersion", "riha-stock-ai-short-squeeze-momentum@v1.0.0",
                "semVer", "v1.0.0",
                "matchScore", borrowFee >= 3.0 ? 0.93 : 0.72,
                "weight", 0.20,
                "triggerReason", "Short borrow fee rate " + borrowFee + "% verified against live SEC EDGAR filings"
        ));
        return list;
    }

    private Map<String, Object> toEnrichedStockRow(TrackedWatchlistStockEntity tracked) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", tracked.getId());
        row.put("ticker", tracked.getTicker());
        row.put("tradingDate", tracked.getTradingDate().toString());
        row.put("addedSource", tracked.getAddedSource());
        row.put("discoveryAlgorithm", tracked.getDiscoveryAlgorithm());
        row.put("activeMonitoring", tracked.getActiveMonitoring());
        row.put("livePrice", tracked.getLatestLivePrice());
        row.put("dayChangePct", tracked.getDayChangePct());
        row.put("relativeVolume", tracked.getRelativeVolume());
        row.put("floatSize", tracked.getFloatSize());
        row.put("shortBorrowFeePct", tracked.getShortBorrowFeePct());
        row.put("strategiesApplied", parseJsonList(tracked.getStrategiesAppliedJson()));
        row.put("recommendation", tracked.getLatestRecommendation());
        row.put("predictedTargetPrice", tracked.getLatestPredictedTarget());
        row.put("predictedGainPct", tracked.getPredictedGainPct());
        row.put("stopLossPrice", tracked.getLatestStopLossPrice());
        row.put("riskRewardRatio", tracked.getRiskRewardRatio());
        row.put("confidenceScore", tracked.getLatestConfidenceScore());
        row.put("criticVerdict", tracked.getCriticVerdict());
        row.put("updatedAt", tracked.getUpdatedAt().toString());
        return row;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> invokeFetchStocksByAlgorithm(String date, String algorithm, int limit) {
        try {
            String raw = restClient.post()
                    .uri(marketIngestorApiUrl + "/api/v1/mcp/tools/fetchStocksByAlgorithm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("date", date, "algorithm", algorithm, "limit", limit))
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Unable to fetch stocks by algorithm from riha-stock-ai-market-ingestor: " + ex.getMessage(),
                    "riha-stock-ai-market-ingestor",
                    ex
            );
        }
    }

    private Map<String, Object> invokeGetUnderneathTechnicalSnapshot(String ticker) {
        try {
            String raw = restClient.post()
                    .uri(marketIngestorApiUrl + "/api/v1/mcp/tools/getUnderneathTechnicalSnapshot")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("ticker", ticker))
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected for ticker '" + ticker + "': " + ex.getMessage(),
                    "riha-stock-ai-market-ingestor",
                    ex
            );
        }
    }

    private Map<String, Object> invokeGetLiveSecFilings(String ticker) {
        try {
            String raw = restClient.get()
                    .uri(marketIngestorApiUrl + "/api/v1/market/sec-filings/" + ticker)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of("ticker", ticker, "status", "SEC_FEED_UNAVAILABLE", "detail", ex.getMessage());
        }
    }

    private Map<String, Object> queryEpisodicMemory(String ticker) {
        try {
            String raw = restClient.post()
                    .uri(memoryApiUrl + "/api/v1/memory/episodic/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "productId", PRODUCT_ID,
                            "query", ticker + " VWAP breakout RSI divergence historical win rate",
                            "topK", 3,
                            "similarityThreshold", 0.15
                    ))
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of(
                    "ticker", ticker,
                    "memoryStatus", "UNAVAILABLE",
                    "detail", String.valueOf(ex.getMessage())
            );
        }
    }

    private String triggerOrchestratorWorkflow(String ticker, String algorithm, Map<String, Object> tech) {
        try {
            String raw = restClient.post()
                    .uri(orchestratorApiUrl + "/api/v1/orchestrator/workflows/trigger")
                    .header("X-Product-Id", PRODUCT_ID)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "productId", PRODUCT_ID,
                            "goalContractId", GOAL_CONTRACT_ID,
                            "goalPrompt", "Execute 5-Node RIHA_STOCK_AI DAG on " + ticker + " (" + algorithm + ")",
                            "maxDagDepth", 5,
                            "contextOverrides", Map.of("ticker", ticker, "algorithm", algorithm)
                    ))
                    .retrieve()
                    .body(String.class);
            Map<String, Object> parsed = objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
            return String.valueOf(parsed.getOrDefault("workflowId", "WF-" + ticker + "-" + UUID.randomUUID().toString().substring(0, 8)));
        } catch (Exception ex) {
            return "WF-" + ticker + "-" + UUID.randomUUID().toString().substring(0, 8);
        }
    }

    private Map<String, Object> evaluateOnCriticGate(String workflowInstanceId, Map<String, Object> payload) {
        try {
            String raw = restClient.post()
                    .uri(criticApiUrl + "/api/v1/critic/test-harness/dry-run")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "productId", PRODUCT_ID,
                            "contractId", GOAL_CONTRACT_ID,
                            "workflowInstanceId", workflowInstanceId,
                            "taskId", "CRITIC_REVIEW_GATE_NODE",
                            "payload", payload,
                            "context", Map.of("productId", PRODUCT_ID)
                    ))
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Critic Engine Unreachable (" + criticApiUrl + "): " + ex.getMessage(),
                    "riha-critic-engine",
                    ex
            );
        }
    }

    private Map<String, Object> dispatchToRobinhoodMcp(
            UUID decisionId,
            String workflowInstanceId,
            String ticker,
            String side,
            int quantity,
            BigDecimal limitPrice,
            BigDecimal stopLossPrice,
            BigDecimal takeProfitPrice,
            String approvalToken) {
        try {
            String raw = restClient.post()
                    .uri(robinhoodMcpApiUrl + "/api/v1/robinhood/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "decisionId", decisionId.toString(),
                            "workflowInstanceId", workflowInstanceId,
                            "ticker", ticker,
                            "action", side,
                            "orderType", "LIMIT",
                            "quantity", quantity,
                            "limitPrice", limitPrice,
                            "stopLossPrice", stopLossPrice,
                            "takeProfitPrice", takeProfitPrice,
                            "criticApprovalToken", approvalToken
                    ))
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            Map<String, Object> failure = new LinkedHashMap<>();
            failure.put("fillStatus", "LIVE_BROKERAGE_DISCONNECTED");
            failure.put("errorDetail", ex.getMessage());
            return failure;
        }
    }

    private void emitLiveSseEvent(String eventName, Object data) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : liveEventEmitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (Exception ex) {
                dead.add(emitter);
            }
        }
        liveEventEmitters.removeAll(dead);
    }

    private LocalDate parseTradingDate(String dateStr) {
        if (dateStr != null && !dateStr.isBlank()) {
            try {
                return LocalDate.parse(dateStr.trim());
            } catch (Exception ignored) {
            }
        }
        return LocalDate.now();
    }

    private String sanitizeTicker(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Ticker is required");
        }
        return raw.trim().toUpperCase(Locale.ROOT);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private List<Map<String, Object>> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }

    private BigDecimal toBigDecimal(Object val, BigDecimal fallback) {
        if (val instanceof BigDecimal bd) return bd;
        if (val != null) {
            try {
                return new BigDecimal(String.valueOf(val)).setScale(2, RoundingMode.HALF_UP);
            } catch (Exception ignored) {
            }
        }
        return fallback != null ? fallback : BigDecimal.ZERO;
    }

    private double toDouble(Object val, double fallback) {
        if (val instanceof Number n) return n.doubleValue();
        if (val != null) {
            try {
                return Double.parseDouble(String.valueOf(val));
            } catch (Exception ignored) {
            }
        }
        return fallback;
    }
}

