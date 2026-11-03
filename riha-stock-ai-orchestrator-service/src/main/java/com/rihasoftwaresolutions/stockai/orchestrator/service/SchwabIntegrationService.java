package com.rihasoftwaresolutions.stockai.orchestrator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.orchestrator.entity.GlobalTradingSettingsEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import com.rihasoftwaresolutions.stockai.orchestrator.repository.GlobalTradingSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class SchwabIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(SchwabIntegrationService.class);

    private final GlobalTradingSettingsRepository settingsRepo;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${riha.stockai.schwab.client-id:XHQMsbAzLcGHBfFEf39lhayOLahbKGm1KhwjZ8mTgfNonvsz}")
    private String configuredClientId;

    @Value("${riha.stockai.schwab.client-secret:weGTF4a8VjudICsfl15NBsmDUEqpptkIE7mC5B8wCKofzx9xaRdwGYaJ3AEPh0jf}")
    private String configuredClientSecret;

    @Value("${riha.stockai.schwab.redirect-uri:https://rihasoftwaresolutions.com}")
    private String defaultRedirectUri;

    @Value("${riha.stockai.schwab.oauth-base-url:https://api.schwabapi.com/v1/oauth}")
    private String oauthBaseUrl;

    @Value("${riha.stockai.schwab.trader-base-url:https://api.schwabapi.com/trader/v1}")
    private String traderBaseUrl;

    @Value("${riha.stockai.orchestrator.default-user-id:ram-ai@rihasoftwaresolutions.com}")
    private String defaultUserId;

    public record SchwabPortfolioSnapshot(
            String accountNumber,
            String accountHash,
            BigDecimal cashBalance,
            BigDecimal buyingPower,
            BigDecimal totalEquity,
            boolean connected,
            List<SchwabPosition> positions,
            List<SchwabOrder> orders,
            Instant retrievedAt
    ) {}

    public record SchwabPosition(
            String symbol,
            String companyName,
            BigDecimal quantity,
            BigDecimal averageCost,
            BigDecimal currentPrice,
            BigDecimal marketValue,
            BigDecimal unrealizedPnl,
            BigDecimal unrealizedPnlPct
    ) {}

    public record SchwabOrder(
            String orderId,
            String symbol,
            OrderSide side,
            OrderType orderType,
            OrderStatus status,
            BigDecimal quantity,
            BigDecimal filledQuantity,
            BigDecimal price,
            Instant enteredTime
    ) {}

    public SchwabIntegrationService(
            GlobalTradingSettingsRepository settingsRepo,
            ObjectMapper objectMapper) {
        this.settingsRepo = settingsRepo;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Resolves the effective client ID for the user (from DB settings or configured default).
     */
    public String getEffectiveClientId(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        return settingsRepo.findById(uid)
                .map(GlobalTradingSettingsEntity::getSchwabClientId)
                .filter(s -> s != null && !s.isBlank())
                .orElse(configuredClientId);
    }

    /**
     * Resolves the effective client Secret for the user.
     */
    public String getEffectiveClientSecret(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        return settingsRepo.findById(uid)
                .map(GlobalTradingSettingsEntity::getSchwabClientSecret)
                .filter(s -> s != null && !s.isBlank())
                .orElse(configuredClientSecret);
    }

    /**
     * Generates the Schwab OAuth authorization URL for the user to authenticate and approve access.
     */
    public String generateAuthorizeUrl(String userId, String redirectUri) {
        String clientId = getEffectiveClientId(userId);
        String redirect = (redirectUri != null && !redirectUri.isBlank()) ? redirectUri : defaultRedirectUri;
        return oauthBaseUrl + "/authorize?client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirect, StandardCharsets.UTF_8);
    }

    /**
     * Exchanges OAuth authorization code for Access & Refresh tokens.
     */
    public synchronized Map<String, Object> exchangeAuthorizationCode(String userId, String authCode, String redirectUri) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        String clientId = getEffectiveClientId(uid);
        String clientSecret = getEffectiveClientSecret(uid);
        String redirect = (redirectUri != null && !redirectUri.isBlank()) ? redirectUri : defaultRedirectUri;

        String authHeader = "Basic " + Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
        String formBody = "grant_type=authorization_code"
                + "&code=" + URLEncoder.encode(authCode, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirect, StandardCharsets.UTF_8);

        log.info("Exchanging Charles Schwab authorization code for tokens (userId={})", uid);

        try {
            String tokenResponse = restClient.post()
                    .uri(oauthBaseUrl + "/token")
                    .header(HttpHeaders.AUTHORIZATION, authHeader)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formBody)
                    .retrieve()
                    .body(String.class);

            if (tokenResponse != null) {
                JsonNode json = objectMapper.readTree(tokenResponse);
                String accessToken = json.path("access_token").asText();
                String refreshToken = json.path("refresh_token").asText();
                int expiresIn = json.path("expires_in").asInt(1800);

                GlobalTradingSettingsEntity settings = settingsRepo.findById(uid).orElseGet(() -> new GlobalTradingSettingsEntity(uid));
                settings.setSchwabClientId(clientId);
                settings.setSchwabClientSecret(clientSecret);
                settings.setSchwabAccessToken(accessToken);
                if (refreshToken != null && !refreshToken.isBlank()) {
                    settings.setSchwabRefreshToken(refreshToken);
                }
                settings.setSchwabTokenExpiresAt(Instant.now().plusSeconds(expiresIn));
                settings.setSchwabConnected(true);
                settingsRepo.save(settings);

                // Fetch and cache account numbers
                fetchAndStoreAccountHash(uid, accessToken);

                log.info("Successfully connected Charles Schwab for user {}", uid);
                return Map.of(
                        "status", "CONNECTED",
                        "broker", "CHARLES_SCHWAB",
                        "expiresInSeconds", expiresIn,
                        "connectedAt", Instant.now().toString()
                );
            }
        } catch (Exception ex) {
            log.error("Failed to exchange Charles Schwab authorization code: {}", ex.getMessage());
            throw new RuntimeException("Charles Schwab OAuth Token Exchange failed: " + ex.getMessage(), ex);
        }
        throw new IllegalStateException("Empty token response received from Charles Schwab");
    }

    /**
     * Refreshes the Schwab access token using the refresh token.
     */
    public synchronized boolean refreshAccessToken(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        var settingsOpt = settingsRepo.findById(uid);
        if (settingsOpt.isEmpty()) return false;
        var settings = settingsOpt.get();

        String refreshToken = settings.getSchwabRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            log.warn("Cannot refresh Schwab token: No refresh token stored for user {}", uid);
            return false;
        }

        String clientId = getEffectiveClientId(uid);
        String clientSecret = getEffectiveClientSecret(uid);
        String authHeader = "Basic " + Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
        String formBody = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8);

        try {
            String tokenResponse = restClient.post()
                    .uri(oauthBaseUrl + "/token")
                    .header(HttpHeaders.AUTHORIZATION, authHeader)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formBody)
                    .retrieve()
                    .body(String.class);

            if (tokenResponse != null) {
                JsonNode json = objectMapper.readTree(tokenResponse);
                settings.setSchwabAccessToken(json.path("access_token").asText());
                String newRefresh = json.path("refresh_token").asText();
                if (newRefresh != null && !newRefresh.isBlank()) {
                    settings.setSchwabRefreshToken(newRefresh);
                }
                settings.setSchwabTokenExpiresAt(Instant.now().plusSeconds(json.path("expires_in").asInt(1800)));
                settings.setSchwabConnected(true);
                settingsRepo.save(settings);
                log.info("Schwab access token successfully refreshed for user {}", uid);
                return true;
            }
        } catch (Exception ex) {
            log.error("Charles Schwab token refresh failed: {}", ex.getMessage());
            settings.setSchwabConnected(false);
            settingsRepo.save(settings);
        }
        return false;
    }

    private void fetchAndStoreAccountHash(String userId, String accessToken) {
        try {
            String response = restClient.get()
                    .uri(traderBaseUrl + "/accounts/accountNumbers")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(String.class);

            if (response != null) {
                JsonNode arr = objectMapper.readTree(response);
                if (arr.isArray() && !arr.isEmpty()) {
                    String hash = arr.get(0).path("hashValue").asText();
                    var settings = settingsRepo.findById(userId).orElse(null);
                    if (settings != null && hash != null && !hash.isBlank()) {
                        settings.setSchwabAccountHash(hash);
                        settingsRepo.save(settings);
                        log.info("Stored Schwab account hash for user {}", userId);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Could not retrieve Schwab account numbers hash: {}", ex.getMessage());
        }
    }

    /**
     * Pulls live account balances, holdings, and positions from Charles Schwab Trader API.
     */
    public SchwabPortfolioSnapshot fetchLiveSchwabPortfolio(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        GlobalTradingSettingsEntity settings = settingsRepo.findById(uid).orElse(null);

        if (settings == null || settings.getSchwabAccessToken() == null || settings.getSchwabAccessToken().isBlank()) {
            return new SchwabPortfolioSnapshot(
                    "SCHWAB-UNCONNECTED",
                    null,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    false,
                    Collections.emptyList(),
                    Collections.emptyList(),
                    Instant.now()
            );
        }

        // Verify token expiration
        if (settings.getSchwabTokenExpiresAt() != null && settings.getSchwabTokenExpiresAt().isBefore(Instant.now())) {
            boolean refreshed = refreshAccessToken(uid);
            if (!refreshed) {
                return new SchwabPortfolioSnapshot(
                        "SCHWAB-TOKEN-EXPIRED",
                        settings.getSchwabAccountHash(),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        false,
                        Collections.emptyList(),
                        Collections.emptyList(),
                        Instant.now()
                );
            }
            settings = settingsRepo.findById(uid).orElse(settings);
        }

        try {
            String accountsUrl = traderBaseUrl + "/accounts?fields=positions";
            String accountsJson = restClient.get()
                    .uri(accountsUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + settings.getSchwabAccessToken())
                    .retrieve()
                    .body(String.class);

            if (accountsJson != null && !accountsJson.isBlank()) {
                JsonNode root = objectMapper.readTree(accountsJson);
                if (root.isArray() && !root.isEmpty()) {
                    JsonNode acc = root.get(0).path("securitiesAccount");
                    String accNum = acc.path("accountNumber").asText("SCHWAB-MAIN");
                    JsonNode balances = acc.path("currentBalances");
                    BigDecimal cash = new BigDecimal(balances.path("cashBalance").asText("0.0"));
                    BigDecimal buyingPower = new BigDecimal(balances.path("buyingPower").asText(cash.toString()));
                    BigDecimal totalEquity = new BigDecimal(balances.path("liquidationValue").asText(cash.toString()));

                    List<SchwabPosition> positions = new ArrayList<>();
                    JsonNode posArray = acc.path("positions");
                    if (posArray.isArray()) {
                        for (JsonNode posNode : posArray) {
                            JsonNode instrument = posNode.path("instrument");
                            String symbol = instrument.path("symbol").asText("UNKNOWN");
                            String company = instrument.path("description").asText(symbol);
                            BigDecimal qty = new BigDecimal(posNode.path("longQuantity").asText(posNode.path("shortQuantity").asText("0.0")));
                            BigDecimal avgPrice = new BigDecimal(posNode.path("averagePrice").asText("0.0"));
                            BigDecimal mktValue = new BigDecimal(posNode.path("marketValue").asText("0.0"));
                            BigDecimal curPrice = (qty.compareTo(BigDecimal.ZERO) > 0)
                                    ? mktValue.divide(qty, 4, java.math.RoundingMode.HALF_UP)
                                    : avgPrice;
                            BigDecimal unPnl = new BigDecimal(posNode.path("currentDayProfitLoss").asText("0.0"));
                            BigDecimal unPnlPct = new BigDecimal(posNode.path("currentDayProfitLossPercentage").asText("0.0"));

                            positions.add(new SchwabPosition(symbol, company, qty, avgPrice, curPrice, mktValue, unPnl, unPnlPct));
                        }
                    }

                    List<SchwabOrder> orders = fetchSchwabOrders(uid, settings.getSchwabAccountHash(), settings.getSchwabAccessToken());

                    return new SchwabPortfolioSnapshot(
                            accNum,
                            settings.getSchwabAccountHash(),
                            cash,
                            buyingPower,
                            totalEquity,
                            true,
                            positions,
                            orders,
                            Instant.now()
                    );
                }
            }
        } catch (Exception ex) {
            log.error("Charles Schwab Trader API fetch failed: {}", ex.getMessage());
        }

        return new SchwabPortfolioSnapshot(
                "SCHWAB-ERROR",
                settings.getSchwabAccountHash(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                false,
                Collections.emptyList(),
                Collections.emptyList(),
                Instant.now()
        );
    }

    /**
     * Pulls working and recent orders from Charles Schwab.
     */
    public List<SchwabOrder> fetchSchwabOrders(String userId, String accountHash, String accessToken) {
        if (accountHash == null || accountHash.isBlank() || accessToken == null || accessToken.isBlank()) {
            return Collections.emptyList();
        }
        try {
            String ordersUrl = traderBaseUrl + "/accounts/" + accountHash + "/orders";
            String ordersJson = restClient.get()
                    .uri(ordersUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(String.class);

            if (ordersJson != null && !ordersJson.isBlank()) {
                JsonNode root = objectMapper.readTree(ordersJson);
                if (root.isArray()) {
                    List<SchwabOrder> list = new ArrayList<>();
                    for (JsonNode o : root) {
                        String orderId = o.path("orderId").asText(UUID.randomUUID().toString());
                        String statusStr = o.path("status").asText("WORKING");
                        OrderStatus status = mapSchwabOrderStatus(statusStr);

                        JsonNode orderLeg = o.path("orderLegCollection").isArray() && !o.path("orderLegCollection").isEmpty()
                                ? o.path("orderLegCollection").get(0)
                                : null;

                        String sym = (orderLeg != null) ? orderLeg.path("instrument").path("symbol").asText("UNKNOWN") : "UNKNOWN";
                        String instruction = (orderLeg != null) ? orderLeg.path("instruction").asText("BUY") : "BUY";
                        OrderSide side = instruction.toUpperCase().contains("SELL") ? OrderSide.SELL : OrderSide.BUY;

                        BigDecimal qty = new BigDecimal(o.path("quantity").asText("0.0"));
                        BigDecimal filledQty = new BigDecimal(o.path("filledQuantity").asText("0.0"));
                        BigDecimal price = new BigDecimal(o.path("price").asText("0.0"));

                        list.add(new SchwabOrder(orderId, sym, side, OrderType.MARKET, status, qty, filledQty, price, Instant.now()));
                    }
                    return list;
                }
            }
        } catch (Exception ex) {
            log.warn("Could not fetch Schwab orders: {}", ex.getMessage());
        }
        return Collections.emptyList();
    }

    /**
     * Fetches transaction history from Charles Schwab.
     */
    public List<Map<String, Object>> fetchSchwabTransactions(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        GlobalTradingSettingsEntity settings = settingsRepo.findById(uid).orElse(null);
        if (settings == null || settings.getSchwabAccessToken() == null || settings.getSchwabAccountHash() == null) {
            return Collections.emptyList();
        }

        try {
            String txUrl = traderBaseUrl + "/accounts/" + settings.getSchwabAccountHash() + "/transactions";
            String json = restClient.get()
                    .uri(txUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + settings.getSchwabAccessToken())
                    .retrieve()
                    .body(String.class);

            if (json != null && !json.isBlank()) {
                JsonNode root = objectMapper.readTree(json);
                if (root.isArray()) {
                    List<Map<String, Object>> list = new ArrayList<>();
                    for (JsonNode txNode : root) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("activityId", txNode.path("activityId").asText());
                        map.put("time", txNode.path("time").asText());
                        map.put("type", txNode.path("type").asText());
                        map.put("description", txNode.path("description").asText());
                        map.put("amount", txNode.path("amount").asText());
                        list.add(map);
                    }
                    return list;
                }
            }
        } catch (Exception ex) {
            log.warn("Could not fetch Schwab transactions: {}", ex.getMessage());
        }
        return Collections.emptyList();
    }

    private OrderStatus mapSchwabOrderStatus(String schwabStatus) {
        if (schwabStatus == null) return OrderStatus.PENDING;
        return switch (schwabStatus.toUpperCase(Locale.ROOT)) {
            case "FILLED" -> OrderStatus.FILLED;
            case "CANCELLED", "CANCELED" -> OrderStatus.CANCELLED;
            case "REJECTED" -> OrderStatus.REJECTED;
            case "WORKING", "QUEUED", "ACCEPTED" -> OrderStatus.WORKING;
            default -> OrderStatus.PENDING;
        };
    }
}
