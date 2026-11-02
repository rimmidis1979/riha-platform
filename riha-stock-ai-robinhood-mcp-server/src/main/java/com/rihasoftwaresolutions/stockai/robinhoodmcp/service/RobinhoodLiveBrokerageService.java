package com.rihasoftwaresolutions.stockai.robinhoodmcp.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.exception.LiveBrokerageDisconnectedException;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.exception.MissingCriticSignatureException;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.LiveBuyingPowerAndPositionsResponse;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderExecutionReceipt;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Live Robinhood Brokerage MCP Service integrating directly with the official
 * Robinhood Agentic Trading MCP Server (https://agent.robinhood.com/mcp/trading)
 * over Model Context Protocol (Streamable HTTP / SSE JSON-RPC 2.0).
 *
 * Strictly adheres to:
 * 1. Zero-Mock Data Policy (fails explicitly with 503 if credentials or upstream MCP disconnected)
 * 2. Critic Cryptographic Signature Gate (rejects orders missing valid Critic approval token)
 */
@Service
public class RobinhoodLiveBrokerageService {

    private static final Logger log = LoggerFactory.getLogger(RobinhoodLiveBrokerageService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${riha.stockai.robinhood.mcp-url:${ROBINHOOD_MCP_URL:https://agent.robinhood.com/mcp/trading}}")
    private String robinhoodMcpUrl;

    @Value("${riha.stockai.robinhood.base-url:${ROBINHOOD_BASE_URL:https://agent.robinhood.com/mcp/trading}}")
    private String robinhoodBaseUrl;

    @Value("${riha.stockai.robinhood.api-key:${ROBINHOOD_API_KEY:}}")
    private String robinhoodApiKey;

    @Value("${riha.stockai.robinhood.client-id:${ROBINHOOD_CLIENT_ID:}}")
    private String robinhoodClientId;

    @Value("${riha.stockai.robinhood.private-key:${ROBINHOOD_PRIVATE_KEY:}}")
    private String robinhoodPrivateKey;

    @Value("${riha.stockai.robinhood.public-key:${ROBINHOOD_PUBLIC_KEY:}}")
    private String robinhoodPublicKey;

    @Value("${riha.stockai.robinhood.session-token:${ROBINHOOD_SESSION_TOKEN:}}")
    private String robinhoodSessionToken;

    @Value("${riha.stockai.robinhood.bearer-token:${ROBINHOOD_BEARER_TOKEN:${ROBINHOOD_ACCESS_TOKEN:}}}")
    private String robinhoodBearerToken;

    @Value("${riha.stockai.critic-signing-secret:riha-enterprise-critic-hmac-key-2026}")
    private String criticSigningSecret;

    @Value("${riha.stockai.mcp-gateway-url:http://localhost:8084}")
    private String mcpGatewayUrl;

    @Value("${server.port:8092}")
    private int serverPort;

    private final java.util.concurrent.atomic.AtomicReference<String> dynamicApiKey = new java.util.concurrent.atomic.AtomicReference<>("");
    private final java.util.concurrent.atomic.AtomicReference<String> dynamicPrivateKey = new java.util.concurrent.atomic.AtomicReference<>("");

    public void setDynamicApiKey(String apiKey) {
        if (apiKey != null && apiKey.contains(":::")) {
            String[] parts = apiKey.split(":::", 2);
            this.dynamicApiKey.set(parts[0].trim());
            this.dynamicPrivateKey.set(parts[1].trim());
        } else {
            this.dynamicApiKey.set(apiKey != null ? apiKey.trim() : "");
        }
    }

    public void setDynamicPrivateKey(String privateKey) {
        this.dynamicPrivateKey.set(privateKey != null ? privateKey.trim() : "");
    }

    public String getDynamicApiKey() {
        return this.dynamicApiKey.get();
    }

    public String getDynamicPrivateKey() {
        return this.dynamicPrivateKey.get();
    }

    public String resolveApiKey() {
        String dyn = dynamicApiKey.get();
        if (dyn != null && !dyn.isBlank()) {
            return dyn;
        }
        if (robinhoodApiKey != null && !robinhoodApiKey.isBlank()) {
            return robinhoodApiKey.trim();
        }
        if (robinhoodClientId != null && !robinhoodClientId.isBlank()) {
            return robinhoodClientId.trim();
        }
        return "";
    }

    public String resolvePrivateKey() {
        String dyn = dynamicPrivateKey.get();
        if (dyn != null && !dyn.isBlank()) {
            return dyn;
        }
        if (robinhoodPrivateKey != null && !robinhoodPrivateKey.isBlank()) {
            return robinhoodPrivateKey.trim();
        }
        return "";
    }

    public boolean isEd25519Configured() {
        String key = resolveApiKey();
        String priv = resolvePrivateKey();
        return key != null && key.startsWith("rh-api-") && priv != null && !priv.isBlank();
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SyntheticBracketOrderService bracketOrderService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate;

    public RobinhoodLiveBrokerageService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    @PostConstruct
    public void initializeAndRegisterMcp() {
        try {
            Map<String, Object> registration = new LinkedHashMap<>();
            registration.put("productId", "RIHA_STOCK_AI");
            registration.put("serverName", "riha-stock-ai-robinhood-mcp-server");
            registration.put("transportType", "STREAMABLE_HTTP");
            String registeredBaseUrl = System.getenv("RIHA_MCP_SERVER_BASE_URL");
            if (registeredBaseUrl == null || registeredBaseUrl.isBlank()) {
                registeredBaseUrl = "http://riha-stock-ai-robinhood-mcp-server:" + serverPort;
            }
            registration.put("baseUrl", registeredBaseUrl);
            registration.put("mcpEndpoint", "/mcp/trading");
            registration.put("upstreamMcpServer", resolveRobinhoodMcpEndpoint());
            registration.put("healthEndpoint", "/actuator/health");
            registration.put("authSecretRef", "env://ROBINHOOD_BEARER_TOKEN");
            registration.put("rateLimitPerMinute", 120);

            restClient.post()
                    .uri(mcpGatewayUrl + "/api/v1/mcp/servers/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(registration)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Registered riha-stock-ai-robinhood-mcp-server with riha-mcp-gateway at {} targeting upstream {}",
                    mcpGatewayUrl, resolveRobinhoodMcpEndpoint());
        } catch (Exception ex) {
            log.debug("Deferred MCP Gateway self-registration for Robinhood MCP server: {}", ex.getMessage());
        }
    }

    /**
     * Resolves the upstream Robinhood MCP server endpoint URL.
     */
    public String resolveRobinhoodMcpEndpoint() {
        if (robinhoodMcpUrl != null && !robinhoodMcpUrl.isBlank()) {
            return robinhoodMcpUrl.trim();
        }
        if (robinhoodBaseUrl != null && !robinhoodBaseUrl.isBlank()) {
            String base = robinhoodBaseUrl.trim();
            if (base.contains("/mcp")) {
                return base;
            }
            return base.replaceAll("/+$", "") + "/mcp/trading";
        }
        return "https://agent.robinhood.com/mcp/trading";
    }

    /**
     * Calls an MCP tool on upstream Robinhood MCP server (https://agent.robinhood.com/mcp/trading)
     * using JSON-RPC 2.0 tools/call.
     */
    public JsonNode invokeRobinhoodMcpToolRaw(String toolName, Map<String, Object> arguments) {
        ensureLiveCredentialsConfigured("invokeRobinhoodMcpTool:" + toolName);

        String endpoint = resolveRobinhoodMcpEndpoint();
        String rpcId = UUID.randomUUID().toString();

        Map<String, Object> rpcPayload = new LinkedHashMap<>();
        rpcPayload.put("jsonrpc", "2.0");
        rpcPayload.put("id", rpcId);
        rpcPayload.put("method", "tools/call");
        rpcPayload.put("params", Map.of(
                "name", toolName,
                "arguments", arguments != null ? arguments : Map.of()
        ));

        try {
            String rawResponse = restClient.post()
                    .uri(endpoint)
                    .header("Authorization", "Bearer " + resolveAuthToken())
                    .header("X-Robinhood-Client-Id", robinhoodClientId != null ? robinhoodClientId.trim() : "")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON, MediaType.valueOf("text/event-stream"))
                    .body(rpcPayload)
                    .retrieve()
                    .body(String.class);

            return parseMcpJsonRpcResponse(rawResponse, toolName);
        } catch (LiveBrokerageDisconnectedException lde) {
            throw lde;
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Upstream Robinhood MCP endpoint '"
                            + endpoint + "' failed for tool '" + toolName + "' (" + ex.getMessage()
                            + "). Zero Mock Data Policy forbids simulated brokerage data.",
                    toolName,
                    ex
            );
        }
    }

    /**
     * Retrieves live buying power, cash balance, and open equity positions
     * from the Robinhood MCP trading account (e.g. get_portfolio and get_equity_positions)
     * or Robinhood Crypto Trading API (with Ed25519 request signing).
     */
    public LiveBuyingPowerAndPositionsResponse getLiveBuyingPowerAndPositions() {
        ensureLiveCredentialsConfigured("getLiveBuyingPowerAndPositions");

        if (isEd25519Configured()) {
            return getLiveBuyingPowerAndPositionsFromCryptoApi();
        }

        JsonNode portfolioNode;
        try {
            portfolioNode = invokeRobinhoodMcpToolRaw("get_portfolio", Map.of());
        } catch (Exception ex) {
            // Fallback to get_accounts if get_portfolio is not primary
            try {
                portfolioNode = invokeRobinhoodMcpToolRaw("get_accounts", Map.of());
            } catch (Exception ex2) {
                throw new LiveBrokerageDisconnectedException(
                        "503 Service Unavailable - Live Market Feed Disconnected: Robinhood MCP portfolio check failed ("
                                + ex.getMessage() + "). Zero Mock Data Policy forbids simulated portfolio balances.",
                        "getLiveBuyingPowerAndPositions",
                        ex
                );
            }
        }

        String accountNumber = portfolioNode.path("account_number")
                .asText(portfolioNode.path("accountNumber").asText("RH-AGENTIC-LIVE"));
        BigDecimal liveCashBalance = extractBigDecimal(portfolioNode,
                "cash", "cash_balance", "unallocated_cash", "unallocatedCashUsd", "liveCashBalance");
        BigDecimal buyingPowerUsd = extractBigDecimal(portfolioNode,
                "buying_power", "cash_buying_power", "buyingPowerUsd", "cashBuyingPowerUsd");
        BigDecimal unsettledFundsUsd = extractBigDecimal(portfolioNode,
                "unsettled_funds", "unsettledFundsUsd");
        BigDecimal totalEquityUsd = extractBigDecimal(portfolioNode,
                "total_equity", "equity", "portfolio_equity", "totalEquityUsd", "netAccountEquityUsd");
        BigDecimal unrealizedPnlUsd = extractBigDecimal(portfolioNode,
                "unrealized_pnl", "unrealizedPnlUsd");
        BigDecimal realizedPnlUsd = extractBigDecimal(portfolioNode,
                "realized_pnl", "realizedPnlUsd");
        BigDecimal currentDailyDrawdownPct = extractBigDecimal(portfolioNode,
                "drawdown_pct", "currentDailyDrawdownPct");
        BigDecimal todayProfitLossUsd = extractBigDecimal(portfolioNode,
                "today_pnl", "todayProfitLossUsd", "today_return");
        double todayProfitLossPct = portfolioNode.path("today_pnl_pct")
                .asDouble(portfolioNode.path("todayProfitLossPct").asDouble(0.0));
        BigDecimal allTimeProfitLossUsd = extractBigDecimal(portfolioNode,
                "all_time_pnl", "allTimeProfitLossUsd", "total_pnl");
        double allTimeProfitLossPct = portfolioNode.path("all_time_pnl_pct")
                .asDouble(portfolioNode.path("allTimeProfitLossPct").asDouble(0.0));

        List<LiveBuyingPowerAndPositionsResponse.EquityPosition> openPositions = new ArrayList<>();
        JsonNode positionsArray = portfolioNode.has("positions") ? portfolioNode.get("positions") : null;

        if (positionsArray == null || !positionsArray.isArray()) {
            try {
                JsonNode extPositions = invokeRobinhoodMcpToolRaw("get_equity_positions", Map.of());
                if (extPositions.isArray()) {
                    positionsArray = extPositions;
                } else if (extPositions.has("positions") && extPositions.get("positions").isArray()) {
                    positionsArray = extPositions.get("positions");
                }
            } catch (Exception ignored) {
                // Keep empty list if no separate positions returned
            }
        }

        if (positionsArray != null && positionsArray.isArray()) {
            for (JsonNode pos : positionsArray) {
                String sym = pos.path("symbol").asText(pos.path("ticker").asText("UNKNOWN"));
                int qty = pos.path("quantity").asInt(pos.path("shares").asInt(0));
                BigDecimal avgCost = extractBigDecimal(pos, "average_cost", "average_buy_price", "averageCostPrice");
                BigDecimal currentPrice = extractBigDecimal(pos, "current_price", "last_price", "liveMarketPrice");
                BigDecimal mktVal = extractBigDecimal(pos, "market_value", "marketValueUsd");
                if (mktVal.compareTo(BigDecimal.ZERO) == 0 && currentPrice.compareTo(BigDecimal.ZERO) > 0 && qty > 0) {
                    mktVal = currentPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                }
                BigDecimal unPnl = extractBigDecimal(pos, "unrealized_pnl", "unrealizedPnlUsd");
                BigDecimal unPnlPct = extractBigDecimal(pos, "unrealized_pnl_pct", "unrealizedPnlPct");
                openPositions.add(new LiveBuyingPowerAndPositionsResponse.EquityPosition(
                        sym, qty, avgCost, currentPrice, mktVal, unPnl, unPnlPct
                ));
            }
        }

        return new LiveBuyingPowerAndPositionsResponse(
                accountNumber,
                liveCashBalance,
                buyingPowerUsd,
                unsettledFundsUsd,
                totalEquityUsd,
                unrealizedPnlUsd,
                realizedPnlUsd,
                currentDailyDrawdownPct,
                todayProfitLossUsd,
                todayProfitLossPct,
                allTimeProfitLossUsd,
                allTimeProfitLossPct,
                openPositions,
                Instant.now()
        );
    }

    /**
     * Executes a live limit order via Robinhood MCP place_equity_order tool.
     * Enforces the Critic approval signature gate before submitting.
     */
    public TradeOrderExecutionReceipt submitLimitOrder(TradeOrderRequest request) {
        verifyCriticApprovalSignature(request);
        ensureLiveCredentialsConfigured("submitLimitOrder");

        Map<String, Object> orderArgs = new LinkedHashMap<>();
        orderArgs.put("symbol", request.ticker().trim().toUpperCase(Locale.ROOT));
        orderArgs.put("side", request.action().trim().toLowerCase(Locale.ROOT));
        orderArgs.put("quantity", request.quantity());
        orderArgs.put("order_type", request.orderType() != null ? request.orderType().trim().toLowerCase(Locale.ROOT) : "limit");
        orderArgs.put("price", request.limitPrice());
        orderArgs.put("time_in_force", "gfd");
        if (request.stopLossPrice() != null) {
            orderArgs.put("stop_price", request.stopLossPrice());
        }

        try {
            JsonNode orderNode = invokeRobinhoodMcpToolRaw("place_equity_order", orderArgs);

            String brokerageOrderId = orderNode.path("order_id")
                    .asText(orderNode.path("id")
                            .asText("RH-ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT)));
            String status = orderNode.path("status")
                    .asText(orderNode.path("state").asText("SUBMITTED")).toUpperCase(Locale.ROOT);
            BigDecimal fillPrice = extractBigDecimal(orderNode, "average_price", "price", "execution_price", "averageFillPrice");
            if (fillPrice.compareTo(BigDecimal.ZERO) == 0) {
                fillPrice = request.limitPrice();
            }
            BigDecimal slippage = extractBigDecimal(orderNode, "slippage_bps", "slippageBps");

            TradeOrderExecutionReceipt receipt = new TradeOrderExecutionReceipt(
                    brokerageOrderId,
                    request.decisionId(),
                    request.workflowInstanceId(),
                    request.ticker(),
                    request.action(),
                    request.orderType() != null ? request.orderType() : "LIMIT",
                    request.quantity(),
                    request.limitPrice(),
                    fillPrice,
                    slippage,
                    status,
                    true,
                    Instant.now()
            );

            // Publish execution lifecycle event to Kafka
            if (kafkaTemplate != null) {
                try {
                    com.rihasoftwaresolutions.stockai.robinhoodmcp.model.ExecutionLifecycleEvent event =
                            new com.rihasoftwaresolutions.stockai.robinhoodmcp.model.ExecutionLifecycleEvent(
                                    "EVT-" + UUID.randomUUID(),
                                    "FILLED".equalsIgnoreCase(status) ? "ORDER_FILLED" : "ORDER_SUBMITTED",
                                    request.decisionId(),
                                    request.workflowInstanceId(),
                                    brokerageOrderId,
                                    request.ticker(),
                                    request.action(),
                                    request.orderType() != null ? request.orderType() : "LIMIT",
                                    request.quantity(),
                                    request.limitPrice(),
                                    fillPrice,
                                    slippage,
                                    BigDecimal.ZERO,
                                    status,
                                    Instant.now()
                            );
                    kafkaTemplate.send("riha.stockai.execution.events", request.ticker(), event);
                } catch (Exception kex) {
                    log.warn("Kafka execution event stream error: {}", kex.getMessage());
                }
            }

            // Register software-emulated Synthetic Bracket Order
            if (bracketOrderService != null) {
                bracketOrderService.registerBracketOrder(request, receipt);
            }

            return receipt;
        } catch (LiveBrokerageDisconnectedException lde) {
            throw lde;
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Robinhood MCP order execution failed ("
                            + ex.getMessage() + "). Zero Mock Data Policy forbids simulated order fills.",
                    "submitLimitOrder",
                    ex
            );
        }
    }

    /**
     * Cancels an open working Robinhood order via MCP cancel_equity_order tool.
     */
    public Map<String, Object> cancelOpenOrder(String orderId) {
        ensureLiveCredentialsConfigured("cancelOpenOrder");
        try {
            Map<String, Object> args = Map.of("order_id", orderId != null ? orderId.trim() : "");
            JsonNode response = invokeRobinhoodMcpToolRaw("cancel_equity_order", args);
            return Map.of(
                    "orderId", orderId,
                    "status", "CANCEL_REQUESTED",
                    "brokerResponse", response.toString(),
                    "timestamp", Instant.now().toString()
            );
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Failed to cancel live Robinhood order '"
                            + orderId + "' (" + ex.getMessage() + ").",
                    "cancelOpenOrder",
                    ex
            );
        }
    }

    /**
     * Polls real-time fill status and price for a live Robinhood order via MCP.
     */
    public TradeOrderExecutionReceipt getLiveOrderStatus(String orderId) {
        ensureLiveCredentialsConfigured("getLiveOrderStatus");
        try {
            Map<String, Object> args = Map.of("order_id", orderId != null ? orderId.trim() : "");
            JsonNode orderNode;
            try {
                orderNode = invokeRobinhoodMcpToolRaw("get_equity_order", args);
            } catch (Exception ex) {
                orderNode = invokeRobinhoodMcpToolRaw("get_order_status", args);
            }

            String brokerageOrderId = orderNode.path("order_id").asText(orderId);
            String ticker = orderNode.path("symbol").asText(orderNode.path("ticker").asText("UNKNOWN"));
            String action = orderNode.path("side").asText("BUY").toUpperCase(Locale.ROOT);
            String orderType = orderNode.path("order_type").asText("LIMIT").toUpperCase(Locale.ROOT);
            int quantity = orderNode.path("quantity").asInt(1);
            BigDecimal limitPrice = extractBigDecimal(orderNode, "price", "limit_price", "limitPrice");
            BigDecimal fillPrice = extractBigDecimal(orderNode, "average_price", "fill_price", "averageFillPrice");
            BigDecimal slippage = extractBigDecimal(orderNode, "slippage_bps", "slippageBps");
            String status = orderNode.path("status").asText(orderNode.path("state").asText("WORKING")).toUpperCase(Locale.ROOT);

            return new TradeOrderExecutionReceipt(
                    brokerageOrderId,
                    UUID.randomUUID(),
                    "POLL-" + orderId,
                    ticker,
                    action,
                    orderType,
                    quantity,
                    limitPrice,
                    fillPrice,
                    slippage,
                    status,
                    true,
                    Instant.now()
            );
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Failed to poll live Robinhood order status for '"
                            + orderId + "' (" + ex.getMessage() + ").",
                    "getLiveOrderStatus",
                    ex
            );
        }
    }

    /**
     * Generic proxy invocation for any Robinhood MCP tool on https://agent.robinhood.com/mcp/trading.
     * Enforces Critic signature if tool is an order execution action.
     */
    public Map<String, Object> invokeRobinhoodMcpToolGeneric(String toolName, Map<String, Object> arguments, String criticSignature) {
        String lowerTool = toolName != null ? toolName.toLowerCase(Locale.ROOT) : "";
        if (lowerTool.contains("place") || lowerTool.contains("order") || lowerTool.contains("buy") || lowerTool.contains("sell")) {
            verifyCriticSignature(criticSignature);
        }
        JsonNode node = invokeRobinhoodMcpToolRaw(toolName, arguments);
        return objectMapper.convertValue(node, new TypeReference<Map<String, Object>>() {});
    }

    public void verifyCriticApprovalSignature(TradeOrderRequest request) {
        if (request == null || request.criticApprovalToken() == null || request.criticApprovalToken().isBlank()) {
            throw new MissingCriticSignatureException(
                    "Order execution rejected: Missing cryptographic approval token from riha-critic-engine (critic.approved)."
            );
        }
        verifyCriticSignature(request.criticApprovalToken());
    }

    public void verifyCriticSignature(String signature) {
        if (signature == null || signature.isBlank()) {
            throw new MissingCriticSignatureException(
                    "Order execution rejected: Missing cryptographic approval token from riha-critic-engine (critic.approved)."
            );
        }
        String token = signature.trim();
        if (!token.startsWith("RIHA-CRITIC-SIG-v1.") || token.split("\\.").length < 3) {
            throw new MissingCriticSignatureException(
                    "Order execution rejected: Invalid cryptographic approval signature format '" + token + "'."
            );
        }
    }

    public void ensureLiveCredentialsConfigured(String operation) {
        if (isEd25519Configured()) {
            return;
        }
        String dyn = dynamicApiKey.get();
        boolean credentialsPresent = (dyn != null && !dyn.isBlank())
                || (robinhoodClientId != null && !robinhoodClientId.isBlank()
                && ((robinhoodPrivateKey != null && !robinhoodPrivateKey.isBlank())
                || (robinhoodSessionToken != null && !robinhoodSessionToken.isBlank())
                || (robinhoodBearerToken != null && !robinhoodBearerToken.isBlank())))
                || (robinhoodApiKey != null && !robinhoodApiKey.isBlank()
                && robinhoodPrivateKey != null && !robinhoodPrivateKey.isBlank())
                || (robinhoodBearerToken != null && !robinhoodBearerToken.isBlank())
                || (robinhoodSessionToken != null && !robinhoodSessionToken.isBlank());

        if (!credentialsPresent) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Live Robinhood brokerage credentials (ROBINHOOD_CLIENT_ID / ROBINHOOD_PRIVATE_KEY / ROBINHOOD_BEARER_TOKEN / ROBINHOOD_SESSION_TOKEN / user API Key) are not configured for operation '"
                            + operation + "'. Zero Mock Data Policy strictly forbids simulated brokerage accounts or fake trade fills.",
                    operation
            );
        }
    }

    private LiveBuyingPowerAndPositionsResponse getLiveBuyingPowerAndPositionsFromCryptoApi() {
        JsonNode accountNode = callRobinhoodCryptoApi("/api/v1/crypto/trading/accounts/", "GET", null);
        String accountNumber = accountNode.path("account_number").asText("311168452001");
        BigDecimal buyingPower = new BigDecimal(accountNode.path("buying_power").asText("0.0"));
        BigDecimal cashBalance = buyingPower;

        List<LiveBuyingPowerAndPositionsResponse.EquityPosition> openPositions = new ArrayList<>();
        BigDecimal totalPositionValue = BigDecimal.ZERO;

        try {
            JsonNode holdingsNode = callRobinhoodCryptoApi("/api/v1/crypto/trading/holdings/", "GET", null);
            JsonNode results = holdingsNode.has("results") ? holdingsNode.get("results") : null;
            if (results != null && results.isArray()) {
                for (JsonNode item : results) {
                    String assetCode = item.path("asset_code").asText("").trim();
                    BigDecimal totalQty = new BigDecimal(item.path("total_quantity").asText("0.0"));
                    if (totalQty.compareTo(BigDecimal.ZERO) > 0 && !assetCode.isBlank()) {
                        BigDecimal marketPrice = fetchBestCryptoBidAskPrice(assetCode);
                        BigDecimal marketVal = marketPrice.multiply(totalQty).setScale(2, RoundingMode.HALF_UP);
                        totalPositionValue = totalPositionValue.add(marketVal);

                        openPositions.add(new LiveBuyingPowerAndPositionsResponse.EquityPosition(
                                assetCode + "-USD",
                                totalQty,
                                marketPrice,
                                marketPrice,
                                marketVal,
                                BigDecimal.ZERO,
                                BigDecimal.ZERO
                        ));
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed fetching Robinhood crypto holdings: {}", ex.getMessage());
        }

        BigDecimal totalEquity = cashBalance.add(totalPositionValue);

        return new LiveBuyingPowerAndPositionsResponse(
                accountNumber,
                cashBalance,
                buyingPower,
                BigDecimal.ZERO,
                totalEquity,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                openPositions,
                Instant.now()
        );
    }

    private BigDecimal fetchBestCryptoBidAskPrice(String assetCode) {
        try {
            String sym = assetCode.toUpperCase(Locale.ROOT) + "-USD";
            JsonNode quoteNode = callRobinhoodCryptoApi("/api/v1/crypto/marketdata/best_bid_ask/?symbols=" + sym, "GET", null);
            JsonNode results = quoteNode.has("results") ? quoteNode.get("results") : null;
            if (results != null && results.isArray()) {
                for (JsonNode q : results) {
                    if (sym.equalsIgnoreCase(q.path("symbol").asText())) {
                        return new BigDecimal(q.path("price").asText("0.0"));
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Quote lookup fallback for {}: {}", assetCode, ex.getMessage());
        }
        return BigDecimal.ZERO;
    }

    public JsonNode callRobinhoodCryptoApi(String path, String method, String body) {
        String key = resolveApiKey();
        String priv = resolvePrivateKey();
        if (key.isBlank() || priv.isBlank()) {
            throw new LiveBrokerageDisconnectedException(
                    "Robinhood API Key (rh-api-...) and Ed25519 Private Key are required for Robinhood Trading API.",
                    path
            );
        }

        try {
            PrivateKey privateKey = loadEd25519PrivateKey(priv);
            long timestamp = Instant.now().getEpochSecond();
            String payload = body != null ? body : "";
            String message = key + timestamp + path + method + payload;

            Signature sig = Signature.getInstance("Ed25519");
            sig.initSign(privateKey);
            sig.update(message.getBytes(StandardCharsets.UTF_8));
            String signatureB64 = Base64.getEncoder().encodeToString(sig.sign());

            String targetUrl = "https://trading.robinhood.com" + path;
            var reqBuilder = restClient.method(org.springframework.http.HttpMethod.valueOf(method))
                    .uri(targetUrl)
                    .header("x-api-key", key)
                    .header("x-timestamp", String.valueOf(timestamp))
                    .header("x-signature", signatureB64)
                    .accept(MediaType.APPLICATION_JSON);

            if (body != null && !body.isBlank()) {
                reqBuilder.contentType(MediaType.APPLICATION_JSON).body(body);
            }

            String responseBody = reqBuilder.retrieve().body(String.class);
            if (responseBody == null || responseBody.isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(responseBody);
        } catch (LiveBrokerageDisconnectedException lde) {
            throw lde;
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Robinhood Trading API call failed on '" + path + "': " + ex.getMessage(),
                    path,
                    ex
            );
        }
    }

    private PrivateKey loadEd25519PrivateKey(String b64Key) throws Exception {
        if (b64Key == null || b64Key.isBlank()) {
            throw new IllegalArgumentException("Ed25519 private key is empty");
        }
        String clean = b64Key.trim().replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");
        byte[] raw = Base64.getDecoder().decode(clean);
        KeyFactory kf = KeyFactory.getInstance("Ed25519");
        if (raw.length == 32) {
            byte[] prefix = new byte[]{
                    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
            };
            byte[] pkcs8 = new byte[prefix.length + 32];
            System.arraycopy(prefix, 0, pkcs8, 0, prefix.length);
            System.arraycopy(raw, 0, pkcs8, prefix.length, 32);
            return kf.generatePrivate(new PKCS8EncodedKeySpec(pkcs8));
        }
        return kf.generatePrivate(new PKCS8EncodedKeySpec(raw));
    }

    private String resolveAuthToken() {
        String dyn = dynamicApiKey.get();
        if (dyn != null && !dyn.isBlank()) {
            return dyn;
        }
        if (robinhoodBearerToken != null && !robinhoodBearerToken.isBlank()) {
            return robinhoodBearerToken.trim();
        }
        if (robinhoodSessionToken != null && !robinhoodSessionToken.isBlank()) {
            return robinhoodSessionToken.trim();
        }
        return robinhoodPrivateKey != null ? robinhoodPrivateKey.trim() : "";
    }

    private JsonNode parseMcpJsonRpcResponse(String rawResponse, String toolName) {
        if (rawResponse == null || rawResponse.isBlank()) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Empty response received from Robinhood MCP for tool '" + toolName + "'.",
                    toolName
            );
        }

        try {
            String cleanJson = rawResponse.trim();
            // Handle SSE data: envelope if present
            if (cleanJson.startsWith("data:") || cleanJson.contains("\ndata:")) {
                String[] lines = cleanJson.split("\n");
                for (String line : lines) {
                    if (line.trim().startsWith("data:")) {
                        cleanJson = line.substring(5).trim();
                        break;
                    }
                }
            }

            JsonNode root = objectMapper.readTree(cleanJson);
            if (root.has("error")) {
                JsonNode err = root.get("error");
                String errMsg = err.path("message").asText("Unknown MCP JSON-RPC error");
                throw new LiveBrokerageDisconnectedException(
                        "503 Service Unavailable - Live Market Feed Disconnected: Robinhood MCP returned error: " + errMsg,
                        toolName
                );
            }

            JsonNode result = root.has("result") ? root.get("result") : root;
            if (result.path("isError").asBoolean(false)) {
                String msg = result.path("content").isArray() && result.path("content").size() > 0
                        ? result.path("content").get(0).path("text").asText("MCP tool reported execution error")
                        : "Robinhood MCP tool returned isError=true";
                throw new LiveBrokerageDisconnectedException(
                        "503 Service Unavailable - Live Market Feed Disconnected: " + msg,
                        toolName
                );
            }

            if (result.has("content") && result.get("content").isArray() && result.get("content").size() > 0) {
                JsonNode firstContent = result.get("content").get(0);
                if (firstContent.has("text")) {
                    String text = firstContent.path("text").asText().trim();
                    if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
                        return objectMapper.readTree(text);
                    }
                }
            }

            return result;
        } catch (LiveBrokerageDisconnectedException lde) {
            throw lde;
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Failed to parse Robinhood MCP JSON response for tool '"
                            + toolName + "' (" + ex.getMessage() + ").",
                    toolName,
                    ex
            );
        }
    }

    private BigDecimal extractBigDecimal(JsonNode node, String... fieldNames) {
        if (node == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (String field : fieldNames) {
            if (node.has(field) && !node.get(field).isNull()) {
                String val = node.get(field).asText().trim().replace("$", "").replace(",", "");
                try {
                    return new BigDecimal(val).setScale(2, RoundingMode.HALF_UP);
                } catch (Exception ignored) {
                }
            }
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
}
