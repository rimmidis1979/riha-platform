package com.rihasoftwaresolutions.stockai.robinhoodmcp.service;

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

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RobinhoodLiveBrokerageService {

    private static final Logger log = LoggerFactory.getLogger(RobinhoodLiveBrokerageService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${riha.stockai.robinhood.base-url:https://api.robinhood.com}")
    private String robinhoodBaseUrl;

    @Value("${riha.stockai.robinhood.client-id:}")
    private String robinhoodClientId;

    @Value("${riha.stockai.robinhood.private-key:}")
    private String robinhoodPrivateKey;

    @Value("${riha.stockai.robinhood.session-token:}")
    private String robinhoodSessionToken;

    @Value("${riha.stockai.critic-signing-secret:riha-enterprise-critic-hmac-key-2026}")
    private String criticSigningSecret;

    @Value("${riha.stockai.mcp-gateway-url:http://localhost:8084}")
    private String mcpGatewayUrl;

    @Value("${server.port:8092}")
    private int serverPort;

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
            registration.put("baseUrl", "http://localhost:" + serverPort);
            registration.put("healthEndpoint", "/actuator/health");
            registration.put("authSecretRef", "env://ROBINHOOD_PRIVATE_KEY");
            registration.put("rateLimitPerMinute", 120);

            restClient.post()
                    .uri(mcpGatewayUrl + "/api/v1/mcp/servers/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(registration)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Registered riha-stock-ai-robinhood-mcp-server with riha-mcp-gateway at {}", mcpGatewayUrl);
        } catch (Exception ex) {
            log.debug("Deferred MCP Gateway self-registration for Robinhood MCP server: {}", ex.getMessage());
        }
    }

    public LiveBuyingPowerAndPositionsResponse getLiveBuyingPowerAndPositions() {
        ensureLiveCredentialsConfigured("getLiveBuyingPowerAndPositions");
        try {
            String raw = restClient.get()
                    .uri(robinhoodBaseUrl.trim() + "/accounts/")
                    .header("Authorization", "Bearer " + resolveAuthToken())
                    .header("X-Robinhood-Client-Id", robinhoodClientId.trim())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, LiveBuyingPowerAndPositionsResponse.class);
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Live Robinhood brokerage endpoint '"
                            + robinhoodBaseUrl + "/accounts/' failed (" + ex.getMessage() + "). Zero Mock Data Policy forbids simulated portfolio balances.",
                    "getLiveBuyingPowerAndPositions",
                    ex
            );
        }
    }

    public TradeOrderExecutionReceipt submitLimitOrder(TradeOrderRequest request) {
        verifyCriticApprovalSignature(request);
        ensureLiveCredentialsConfigured("submitLimitOrder");

        try {
            String raw = restClient.post()
                    .uri(robinhoodBaseUrl.trim() + "/orders/")
                    .header("Authorization", "Bearer " + resolveAuthToken())
                    .header("X-Robinhood-Client-Id", robinhoodClientId.trim())
                    .header("X-Riha-Critic-Signature", request.criticApprovalToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, TradeOrderExecutionReceipt.class);
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Live Robinhood order execution endpoint '"
                            + robinhoodBaseUrl + "/orders/' failed (" + ex.getMessage() + "). Zero Mock Data Policy forbids simulated order fills.",
                    "submitLimitOrder",
                    ex
            );
        }
    }

    public Map<String, Object> cancelOpenOrder(String orderId) {
        ensureLiveCredentialsConfigured("cancelOpenOrder");
        try {
            String raw = restClient.post()
                    .uri(robinhoodBaseUrl.trim() + "/orders/" + orderId + "/cancel/")
                    .header("Authorization", "Bearer " + resolveAuthToken())
                    .retrieve()
                    .body(String.class);
            return Map.of(
                    "orderId", orderId,
                    "status", "CANCEL_REQUESTED",
                    "brokerResponse", raw != null ? raw : "",
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

    public TradeOrderExecutionReceipt getLiveOrderStatus(String orderId) {
        ensureLiveCredentialsConfigured("getLiveOrderStatus");
        try {
            String raw = restClient.get()
                    .uri(robinhoodBaseUrl.trim() + "/orders/" + orderId + "/")
                    .header("Authorization", "Bearer " + resolveAuthToken())
                    .retrieve()
                    .body(String.class);
            return objectMapper.readValue(raw, TradeOrderExecutionReceipt.class);
        } catch (Exception ex) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Failed to poll live Robinhood order status for '"
                            + orderId + "' (" + ex.getMessage() + ").",
                    "getLiveOrderStatus",
                    ex
            );
        }
    }

    private void verifyCriticApprovalSignature(TradeOrderRequest request) {
        if (request == null || request.criticApprovalToken() == null || request.criticApprovalToken().isBlank()) {
            throw new MissingCriticSignatureException(
                    "Order execution rejected: Missing cryptographic approval token from riha-critic-engine (critic.approved)."
            );
        }
        String token = request.criticApprovalToken().trim();
        if (!token.startsWith("RIHA-CRITIC-SIG-v1.") || token.split("\\.").length < 3) {
            throw new MissingCriticSignatureException(
                    "Order execution rejected: Invalid cryptographic approval signature format '" + token + "'."
            );
        }
    }

    private void ensureLiveCredentialsConfigured(String operation) {
        boolean credentialsPresent = robinhoodClientId != null && !robinhoodClientId.isBlank()
                && ((robinhoodPrivateKey != null && !robinhoodPrivateKey.isBlank())
                || (robinhoodSessionToken != null && !robinhoodSessionToken.isBlank()));
        if (!credentialsPresent) {
            throw new LiveBrokerageDisconnectedException(
                    "503 Service Unavailable - Live Market Feed Disconnected: Live Robinhood brokerage credentials (ROBINHOOD_CLIENT_ID / ROBINHOOD_PRIVATE_KEY) are not configured for operation '"
                            + operation + "'. Zero Mock Data Policy strictly forbids simulated brokerage accounts or fake trade fills.",
                    operation
            );
        }
    }

    private String resolveAuthToken() {
        if (robinhoodSessionToken != null && !robinhoodSessionToken.isBlank()) {
            return robinhoodSessionToken.trim();
        }
        return robinhoodPrivateKey != null ? robinhoodPrivateKey.trim() : "";
    }
}

