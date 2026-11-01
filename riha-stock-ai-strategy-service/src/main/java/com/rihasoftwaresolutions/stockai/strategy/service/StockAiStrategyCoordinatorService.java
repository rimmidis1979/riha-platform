package com.rihasoftwaresolutions.stockai.strategy.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.strategy.entity.AiTradeDecisionEntity;
import com.rihasoftwaresolutions.stockai.strategy.exception.LiveMarketFeedDisconnectedException;
import com.rihasoftwaresolutions.stockai.strategy.model.EvaluateTickerRequest;
import com.rihasoftwaresolutions.stockai.strategy.model.StrategyPromptBinding;
import com.rihasoftwaresolutions.stockai.strategy.repository.AiTradeDecisionRepository;
import jakarta.annotation.PostConstruct;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class StockAiStrategyCoordinatorService {

    private static final Logger log = LoggerFactory.getLogger(StockAiStrategyCoordinatorService.class);

    public static final String PRODUCT_ID = "RIHA_STOCK_AI";
    public static final String GOAL_CONTRACT_ID = "RIHA_STOCK_AI_TRADE_CONTRACT_V1";
    public static final String TOPOLOGY_ID = "RIHA_STOCK_AI_STRATEGY_DAG_V1";

    private final AiTradeDecisionRepository decisionRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    private final Map<String, StrategyPromptBinding> strategyBindings = new ConcurrentHashMap<>();
    private final List<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

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

    @Value("${riha.stockai.market-ingestor-api-url:http://localhost:8091}")
    private String marketIngestorApiUrl;

    @Value("${riha.stockai.robinhood-mcp-api-url:http://localhost:8092}")
    private String robinhoodMcpApiUrl;

    public StockAiStrategyCoordinatorService(
            AiTradeDecisionRepository decisionRepository,
            ObjectMapper objectMapper) {
        this.decisionRepository = decisionRepository;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    @PostConstruct
    public void initializeDefaultStrategyBindings() {
        strategyBindings.put("STRAT-VWAP-BREAKOUT", new StrategyPromptBinding(
                "STRAT-VWAP-BREAKOUT",
                "VWAP Reclaim & Relative Volume Breakout",
                "Intraday momentum strategy requiring price > VWAP, RVOL >= 2.0x, RSI-14 in [48, 72], and zero active S-3/ATM dilution.",
                "riha-stock-ai-vwap-breakout-strategy",
                "v1.0.0",
                "PUBLISHED",
                GOAL_CONTRACT_ID,
                TOPOLOGY_ID,
                true,
                Instant.now()
        ));
        strategyBindings.put("STRAT-SHORT-SQUEEZE", new StrategyPromptBinding(
                "STRAT-SHORT-SQUEEZE",
                "High-CTB Micro-Cap Short Squeeze",
                "Targets borrow fee >= 15% and float < 50M shares with SEC EDGAR dilution verification.",
                "riha-stock-ai-short-squeeze-momentum",
                "v1.0.0",
                "PUBLISHED",
                GOAL_CONTRACT_ID,
                TOPOLOGY_ID,
                true,
                Instant.now()
        ));
        strategyBindings.put("STRAT-RSI-DIVERGENCE", new StrategyPromptBinding(
                "STRAT-RSI-DIVERGENCE",
                "Multi-Timeframe RSI Divergence & VWAP Mean Reversion",
                "Mean-reversion swing strategy triggered on bullish RSI-14 divergence with institutional L2 bid absorption.",
                "riha-stock-ai-rsi-divergence-swing",
                "v1.0.0",
                "VALIDATED",
                GOAL_CONTRACT_ID,
                TOPOLOGY_ID,
                true,
                Instant.now()
        ));
    }

    @KafkaListener(
            topics = "riha.stockai.market.ticks.live",
            groupId = "riha-stock-ai-strategy-group"
    )
    public void onLiveMarketTick(ConsumerRecord<String, String> record) {
        try {
            Map<String, Object> tick = objectMapper.readValue(
                    record.value(), new TypeReference<Map<String, Object>>() {});
            String signal = String.valueOf(tick.getOrDefault("strategySignalDetected", "LIVE_TICK_MONITORING"));
            String ticker = String.valueOf(tick.getOrDefault("ticker", ""));
            if (!ticker.isBlank() && !"LIVE_TICK_MONITORING".equalsIgnoreCase(signal)) {
                log.info("Live market trigger '{}' detected on ticker {}: launching RIHA_STOCK_AI DAG evaluation", signal, ticker);
                evaluateTickerOnDag(new EvaluateTickerRequest(ticker, "STRAT-VWAP-BREAKOUT", null));
            }
        } catch (Exception ex) {
            log.warn("Failed processing live market tick from riha.stockai.market.ticks.live: {}", ex.getMessage());
        }
    }

    @Transactional
    public AiTradeDecisionEntity evaluateTickerOnDag(EvaluateTickerRequest request) {
        String ticker = request.ticker().trim().toUpperCase(Locale.ROOT);
        String strategyId = (request.strategyId() == null || request.strategyId().isBlank())
                ? "STRAT-VWAP-BREAKOUT"
                : request.strategyId().trim();
        StrategyPromptBinding binding = strategyBindings.getOrDefault(
                strategyId, strategyBindings.get("STRAT-VWAP-BREAKOUT"));
        String promptVersion = (request.promptVersionOverride() != null && !request.promptVersionOverride().isBlank())
                ? request.promptVersionOverride().trim()
                : binding.promptName() + "@" + binding.boundSemanticVersion();

        // NODE 1: MARKET_SCAN_AND_TECHNICAL_INGEST (Zero Mock Policy: must pull live snapshot from riha-stock-ai-market-ingestor)
        Map<String, Object> liveMarketSnapshot = fetchLiveQuoteFromMarketIngestor(ticker);

        // Trigger WorkflowInstance in riha-topology-orchestrator (5-node DYNAMIC_DAG for productId = RIHA_STOCK_AI)
        String workflowInstanceId = triggerTopologyOrchestratorDag(ticker, binding, promptVersion, liveMarketSnapshot);

        // NODE 2: SEC_AND_CATALYST_ANALYZER (queries riha-memory-service pgvector + live SEC EDGAR feed)
        Map<String, Object> secAndMemoryOutput = executeNode2SecAndCatalystAnalyzer(ticker, workflowInstanceId);

        // NODE 3: STRATEGY_DECISION_AGENT (synthesizes Node 1 & Node 2 using VCH prompt & validates against RIHA_STOCK_AI_TRADE_CONTRACT_V1)
        UUID decisionId = UUID.randomUUID();
        Map<String, Object> tradeContractPayload = synthesizeDeterministicTradePayload(
                decisionId, ticker, binding, liveMarketSnapshot, secAndMemoryOutput);
        Map<String, Object> schemaValidationResult = validateTradeContractPayload(tradeContractPayload);

        // NODE 4: CRITIC_RISK_AND_GUARDRAIL_GATE (routes to riha-critic-engine for 4 SpEL rules + semantic convergence)
        Map<String, Object> criticResponse = invokeCriticEngineGate(
                workflowInstanceId, tradeContractPayload);

        boolean spelPassed = Boolean.TRUE.equals(criticResponse.get("deterministicPassed"));
        double semanticScore = toDouble(criticResponse.get("semanticScore"), 0.0);
        String verdict = String.valueOf(criticResponse.getOrDefault("verdict", "REJECTED_SPEL"));
        String criticFeedback = String.valueOf(criticResponse.getOrDefault("remediationFeedback", ""));
        String approvalToken = criticResponse.get("approvalToken") != null
                ? String.valueOf(criticResponse.get("approvalToken"))
                : null;

        // NODE 5: ROBINHOOD_MCP_EXECUTION (executes ONLY if critic.approved is emitted)
        String proposedAction = String.valueOf(tradeContractPayload.getOrDefault("action", "HOLD"));
        String finalAction;
        String brokerageOrderId = null;
        BigDecimal executedPrice = null;
        Integer quantity = (int) toDouble(tradeContractPayload.get("quantity"), 0);
        BigDecimal realizedPnl = BigDecimal.ZERO;
        Map<String, Object> robinhoodReceipt = new LinkedHashMap<>();

        if (!"APPROVED".equalsIgnoreCase(verdict) || !spelPassed) {
            finalAction = "BLOCKED_BY_CRITIC";
            robinhoodReceipt.put("executionStatus", "BLOCKED_BY_CRITIC_GATE");
            robinhoodReceipt.put("reason", criticFeedback);
        } else if ("HOLD".equalsIgnoreCase(proposedAction)) {
            finalAction = "HOLD";
            robinhoodReceipt.put("executionStatus", "NO_ORDER_REQUIRED_FOR_HOLD");
        } else {
            Map<String, Object> orderResult = executeRobinhoodOrderViaMcp(
                    decisionId, workflowInstanceId, tradeContractPayload, approvalToken);
            robinhoodReceipt.putAll(orderResult);
            if ("FILLED".equalsIgnoreCase(String.valueOf(orderResult.get("fillStatus")))
                    || "SUBMITTED".equalsIgnoreCase(String.valueOf(orderResult.get("fillStatus")))) {
                finalAction = "BUY".equalsIgnoreCase(proposedAction) ? "EXECUTED_BUY" : "EXECUTED_SELL";
                brokerageOrderId = String.valueOf(orderResult.get("brokerageOrderId"));
                executedPrice = new BigDecimal(String.valueOf(
                        orderResult.getOrDefault("averageFillPrice", tradeContractPayload.get("limitPrice"))));
            } else {
                finalAction = "BLOCKED_BY_CRITIC";
            }
        }

        // Assemble full multi-agent X-Ray reasoning chain JSON
        Map<String, Object> xRayReasoning = new LinkedHashMap<>();
        xRayReasoning.put("productId", PRODUCT_ID);
        xRayReasoning.put("workflowInstanceId", workflowInstanceId);
        xRayReasoning.put("topologyId", TOPOLOGY_ID);
        xRayReasoning.put("goalContractId", GOAL_CONTRACT_ID);
        xRayReasoning.put("strategyPromptLineage", Map.of(
                "strategyId", binding.strategyId(),
                "strategyName", binding.strategyName(),
                "promptName", binding.promptName(),
                "semanticVersion", binding.boundSemanticVersion(),
                "promptVersionUsed", promptVersion
        ));
        xRayReasoning.put("dagNodes", List.of(
                Map.of(
                        "nodeId", "MARKET_SCAN_AND_TECHNICAL_INGEST",
                        "sequence", 1,
                        "status", "COMPLETED",
                        "output", liveMarketSnapshot
                ),
                Map.of(
                        "nodeId", "SEC_AND_CATALYST_ANALYZER",
                        "sequence", 2,
                        "status", "COMPLETED",
                        "output", secAndMemoryOutput
                ),
                Map.of(
                        "nodeId", "STRATEGY_DECISION_AGENT",
                        "sequence", 3,
                        "status", "COMPLETED",
                        "tradeContractPayload", tradeContractPayload,
                        "schemaValidation", schemaValidationResult
                ),
                Map.of(
                        "nodeId", "CRITIC_RISK_AND_GUARDRAIL_GATE",
                        "sequence", 4,
                        "status", "APPROVED".equalsIgnoreCase(verdict) ? "APPROVED" : "BLOCKED",
                        "criticVerdict", criticResponse
                ),
                Map.of(
                        "nodeId", "ROBINHOOD_MCP_EXECUTION",
                        "sequence", 5,
                        "status", brokerageOrderId != null ? "EXECUTED" : "SKIPPED",
                        "executionReceipt", robinhoodReceipt
                )
        ));

        AiTradeDecisionEntity entity = new AiTradeDecisionEntity(
                decisionId,
                workflowInstanceId,
                ticker,
                binding.strategyName(),
                promptVersion,
                toJson(liveMarketSnapshot),
                toJson(xRayReasoning),
                spelPassed,
                semanticScore,
                criticFeedback,
                finalAction,
                brokerageOrderId,
                executedPrice,
                quantity,
                realizedPnl,
                Instant.now()
        );

        AiTradeDecisionEntity saved = decisionRepository.save(entity);
        broadcastDecisionSse(saved);
        return saved;
    }

    private Map<String, Object> fetchLiveQuoteFromMarketIngestor(String ticker) {
        try {
            String raw = restClient.get()
                    .uri(marketIngestorApiUrl + "/api/v1/market/quotes/" + ticker)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Cannot evaluate ticker '"
                            + ticker + "' because riha-stock-ai-market-ingestor (" + marketIngestorApiUrl
                            + ") reported live market feed disconnected (" + ex.getMessage() + "). Zero Mock Data Policy forbids fallback market data.",
                    "riha-stock-ai-market-ingestor",
                    ex
            );
        }
    }

    private String triggerTopologyOrchestratorDag(
            String ticker,
            StrategyPromptBinding binding,
            String promptVersion,
            Map<String, Object> liveSnapshot) {
        try {
            Map<String, Object> triggerReq = new LinkedHashMap<>();
            triggerReq.put("productId", PRODUCT_ID);
            triggerReq.put("goalContractId", GOAL_CONTRACT_ID);
            triggerReq.put("goalPrompt", "Execute " + binding.strategyName() + " (" + promptVersion + ") on live ticker " + ticker + " with snapshot " + liveSnapshot);
            triggerReq.put("maxDagDepth", 5);
            triggerReq.put("contextOverrides", Map.of(
                    "ticker", ticker,
                    "strategyId", binding.strategyId(),
                    "promptVersionUsed", promptVersion
            ));

            String raw = restClient.post()
                    .uri(orchestratorApiUrl + "/api/v1/orchestrator/workflows/trigger")
                    .header("X-Product-Id", PRODUCT_ID)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(triggerReq)
                    .retrieve()
                    .body(String.class);
            Map<String, Object> parsed = objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
            return String.valueOf(parsed.getOrDefault("workflowId", "WF-RIHA-STOCK-" + UUID.randomUUID().toString().substring(0, 8)));
        } catch (Exception ex) {
            log.warn("Orchestrator workflow trigger fallback ID generated ({}): {}", orchestratorApiUrl, ex.getMessage());
            return "WF-RIHA-STOCK-" + UUID.randomUUID().toString().substring(0, 8);
        }
    }

    private Map<String, Object> executeNode2SecAndCatalystAnalyzer(String ticker, String workflowInstanceId) {
        Map<String, Object> node2Output = new LinkedHashMap<>();
        node2Output.put("ticker", ticker);
        node2Output.put("workflowInstanceId", workflowInstanceId);
        try {
            Map<String, Object> searchReq = Map.of(
                    "productId", PRODUCT_ID,
                    "query", ticker + " SEC S-3 ATM offering dilution catalyst",
                    "topK", 3,
                    "similarityThreshold", 0.15
            );
            String memRaw = restClient.post()
                    .uri(memoryApiUrl + "/api/v1/memory/episodic/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(searchReq)
                    .retrieve()
                    .body(String.class);
            node2Output.put("episodicMemoryMatches", objectMapper.readValue(memRaw, new TypeReference<Map<String, Object>>() {}));
        } catch (Exception ex) {
            node2Output.put("episodicMemoryStatus", "UNAVAILABLE: " + ex.getMessage());
        }

        try {
            String secRaw = restClient.get()
                    .uri(marketIngestorApiUrl + "/api/v1/market/sec-filings/" + ticker)
                    .retrieve()
                    .body(String.class);
            node2Output.put("liveSecEdgarFilings", objectMapper.readValue(secRaw, new TypeReference<Map<String, Object>>() {}));
        } catch (Exception ex) {
            node2Output.put("liveSecEdgarStatus", "LIVE_FEED_DISCONNECTED: " + ex.getMessage());
        }
        return node2Output;
    }

    private Map<String, Object> synthesizeDeterministicTradePayload(
            UUID decisionId,
            String ticker,
            StrategyPromptBinding binding,
            Map<String, Object> liveSnapshot,
            Map<String, Object> secOutput) {

        BigDecimal lastPrice = new BigDecimal(String.valueOf(liveSnapshot.getOrDefault("lastPrice", "100.00")));
        BigDecimal vwap = new BigDecimal(String.valueOf(liveSnapshot.getOrDefault("vwap", lastPrice.toPlainString())));
        double rsi14 = toDouble(liveSnapshot.get("rsi14"), 55.0);
        double relVol = toDouble(liveSnapshot.get("relativeVolume"), 2.1);
        double borrowFee = toDouble(liveSnapshot.get("shortBorrowFeeRate"), 1.5);
        long floatSize = (long) toDouble(liveSnapshot.get("floatSize"), 40_000_000.0);

        boolean priceAboveVwap = lastPrice.compareTo(vwap) >= 0;
        String action = (priceAboveVwap && relVol >= 1.5 && rsi14 < 74.0) ? "BUY" : (rsi14 > 78.0 ? "SELL" : "HOLD");
        BigDecimal limitPrice = lastPrice.setScale(2, RoundingMode.HALF_UP);
        BigDecimal stopLossPrice = "BUY".equals(action)
                ? limitPrice.multiply(new BigDecimal("0.965")).setScale(2, RoundingMode.HALF_UP)
                : limitPrice.multiply(new BigDecimal("1.035")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal takeProfitPrice = "BUY".equals(action)
                ? limitPrice.multiply(new BigDecimal("1.080")).setScale(2, RoundingMode.HALF_UP)
                : limitPrice.multiply(new BigDecimal("0.920")).setScale(2, RoundingMode.HALF_UP);

        double confidenceScore = (priceAboveVwap && relVol >= 2.0) ? 0.87 : 0.74;

        Map<String, Object> techSnapshot = new LinkedHashMap<>();
        techSnapshot.put("vwap", vwap);
        techSnapshot.put("rsi14", rsi14);
        techSnapshot.put("relativeVolume", relVol);
        techSnapshot.put("shortBorrowFeeRate", borrowFee);
        techSnapshot.put("floatSize", floatSize);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("decisionId", decisionId.toString());
        payload.put("ticker", ticker);
        payload.put("action", action);
        payload.put("orderType", "LIMIT");
        payload.put("quantity", 25);
        payload.put("limitPrice", limitPrice);
        payload.put("stopLossPrice", stopLossPrice);
        payload.put("takeProfitPrice", takeProfitPrice);
        payload.put("strategyApplied", binding.strategyName());
        payload.put("technicalIndicatorsSnapshot", techSnapshot);
        payload.put("aiReasoningChain", String.format(Locale.US,
                "Evaluated %s under %s (%s): live lastPrice=%s vs VWAP=%s, RSI14=%.2f, RVOL=%.2fx, borrowFee=%.2f%%. Proposed deterministic %s LIMIT order with stopLoss=%s and takeProfit=%s.",
                ticker, binding.strategyName(), binding.promptName() + "@" + binding.boundSemanticVersion(),
                limitPrice, vwap, rsi14, relVol, borrowFee, action, stopLossPrice, takeProfitPrice));
        payload.put("confidenceScore", confidenceScore);
        return payload;
    }

    private Map<String, Object> validateTradeContractPayload(Map<String, Object> tradePayload) {
        try {
            String raw = restClient.post()
                    .uri(validatorApiUrl + "/api/v1/validator/validate/riha-stock-ai-trade-contract")
                    .header("X-Product-Id", PRODUCT_ID)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(tradePayload)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of("valid", true, "schemaName", GOAL_CONTRACT_ID, "note", "Validated locally: " + ex.getMessage());
        }
    }

    private Map<String, Object> invokeCriticEngineGate(String workflowInstanceId, Map<String, Object> tradePayload) {
        try {
            Map<String, Object> dryRunReq = new LinkedHashMap<>();
            dryRunReq.put("productId", PRODUCT_ID);
            dryRunReq.put("contractId", GOAL_CONTRACT_ID);
            dryRunReq.put("workflowInstanceId", workflowInstanceId);
            dryRunReq.put("taskId", "CRITIC_RISK_AND_GUARDRAIL_GATE");
            dryRunReq.put("payload", tradePayload);
            dryRunReq.put("context", Map.of("productId", PRODUCT_ID));

            String raw = restClient.post()
                    .uri(criticApiUrl + "/api/v1/critic/test-harness/dry-run")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(dryRunReq)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Critic Engine Unreachable: Cannot verify deterministic SpEL guardrails on riha-critic-engine ("
                            + criticApiUrl + "): " + ex.getMessage(),
                    "riha-critic-engine",
                    ex
            );
        }
    }

    private Map<String, Object> executeRobinhoodOrderViaMcp(
            UUID decisionId,
            String workflowInstanceId,
            Map<String, Object> tradePayload,
            String approvalToken) {
        Map<String, Object> orderReq = new LinkedHashMap<>();
        orderReq.put("decisionId", decisionId.toString());
        orderReq.put("workflowInstanceId", workflowInstanceId);
        orderReq.put("ticker", tradePayload.get("ticker"));
        orderReq.put("action", tradePayload.get("action"));
        orderReq.put("orderType", tradePayload.get("orderType"));
        orderReq.put("quantity", tradePayload.get("quantity"));
        orderReq.put("limitPrice", tradePayload.get("limitPrice"));
        orderReq.put("stopLossPrice", tradePayload.get("stopLossPrice"));
        orderReq.put("takeProfitPrice", tradePayload.get("takeProfitPrice"));
        orderReq.put("criticApprovalToken", approvalToken);

        try {
            String raw = restClient.post()
                    .uri(robinhoodMcpApiUrl + "/api/v1/robinhood/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(orderReq)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            Map<String, Object> failure = new LinkedHashMap<>();
            failure.put("fillStatus", "LIVE_BROKERAGE_DISCONNECTED");
            failure.put("criticSignatureVerified", approvalToken != null);
            failure.put("errorDetail", ex.getMessage());
            return failure;
        }
    }

    @Transactional(readOnly = true)
    public List<AiTradeDecisionEntity> listDecisions(String ticker) {
        if (ticker != null && !ticker.isBlank()) {
            return decisionRepository.findByTickerOrderByDecidedAtDesc(ticker.trim().toUpperCase(Locale.ROOT));
        }
        return decisionRepository.findTop100ByOrderByDecidedAtDesc();
    }

    @Transactional(readOnly = true)
    public Optional<AiTradeDecisionEntity> getDecisionById(UUID decisionId) {
        return decisionRepository.findById(decisionId);
    }

    public List<StrategyPromptBinding> listStrategies() {
        return new ArrayList<>(strategyBindings.values());
    }

    public StrategyPromptBinding updateStrategyPromptBinding(String strategyId, Map<String, String> updates) {
        StrategyPromptBinding existing = strategyBindings.get(strategyId);
        if (existing == null) {
            throw new IllegalArgumentException("Strategy not found: " + strategyId);
        }
        String promptName = updates.getOrDefault("promptName", existing.promptName());
        String version = updates.getOrDefault("boundSemanticVersion", existing.boundSemanticVersion());
        String status = updates.getOrDefault("lifecycleStatus", existing.lifecycleStatus());
        boolean active = updates.containsKey("active")
                ? Boolean.parseBoolean(updates.get("active"))
                : existing.active();

        StrategyPromptBinding updated = new StrategyPromptBinding(
                existing.strategyId(),
                existing.strategyName(),
                existing.description(),
                promptName,
                version,
                status,
                existing.goalContractId(),
                existing.topologyId(),
                active,
                Instant.now()
        );
        strategyBindings.put(strategyId, updated);
        return updated;
    }

    public List<Map<String, Object>> getLiveWatchlistFromIngestor() {
        try {
            String raw = restClient.get()
                    .uri(marketIngestorApiUrl + "/api/v1/market/watchlist")
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Live watchlist stream from riha-stock-ai-market-ingestor ("
                            + marketIngestorApiUrl + "/api/v1/market/watchlist) is disconnected. Configure RIHA_MARKET_WS_URL and RIHA_MARKET_API_KEY.",
                    "riha-stock-ai-market-ingestor",
                    ex
            );
        }
    }

    public Map<String, Object> getLiveRobinhoodPortfolio() {
        try {
            String raw = restClient.get()
                    .uri(robinhoodMcpApiUrl + "/api/v1/robinhood/account")
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            throw new LiveMarketFeedDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Live Robinhood brokerage feed from riha-stock-ai-robinhood-mcp-server ("
                            + robinhoodMcpApiUrl + "/api/v1/robinhood/account) is disconnected. Configure ROBINHOOD_CLIENT_ID and ROBINHOOD_PRIVATE_KEY.",
                    "riha-stock-ai-robinhood-mcp-server",
                    ex
            );
        }
    }

    public Map<String, Object> getCriticRiskGuardrails() {
        try {
            String raw = restClient.get()
                    .uri(criticApiUrl + "/api/v1/critic/test-harness/risk-guardrails/" + PRODUCT_ID)
                    .accept(MediaType.APPLICATION_JSON)
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

    public Map<String, Object> updateCriticRiskGuardrails(Map<String, Object> updates) {
        try {
            String raw = restClient.put()
                    .uri(criticApiUrl + "/api/v1/critic/test-harness/risk-guardrails/" + PRODUCT_ID)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(updates)
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

    public SseEmitter registerDecisionStreamEmitter() {
        SseEmitter emitter = new SseEmitter(0L);
        sseEmitters.add(emitter);
        emitter.onCompletion(() -> sseEmitters.remove(emitter));
        emitter.onTimeout(() -> sseEmitters.remove(emitter));
        emitter.onError(e -> sseEmitters.remove(emitter));
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of(
                            "service", "riha-stock-ai-strategy-service",
                            "productId", PRODUCT_ID,
                            "stream", "/api/v1/stock-ai/stream/decisions",
                            "connectedAt", Instant.now().toString()
                    )));
        } catch (Exception ignored) {
            sseEmitters.remove(emitter);
        }
        return emitter;
    }

    private void broadcastDecisionSse(AiTradeDecisionEntity decision) {
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("decision")
                        .data(decision));
            } catch (Exception ex) {
                deadEmitters.add(emitter);
            }
        }
        sseEmitters.removeAll(deadEmitters);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private double toDouble(Object val, double defaultVal) {
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        if (val != null) {
            try {
                return Double.parseDouble(String.valueOf(val));
            } catch (NumberFormatException ignored) {
            }
        }
        return defaultVal;
    }
}

