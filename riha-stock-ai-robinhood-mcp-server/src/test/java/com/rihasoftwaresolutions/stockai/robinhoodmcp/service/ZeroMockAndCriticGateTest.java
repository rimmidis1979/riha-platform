package com.rihasoftwaresolutions.stockai.robinhoodmcp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.controller.RobinhoodMcpServerController;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.exception.LiveBrokerageDisconnectedException;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.exception.MissingCriticSignatureException;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.mcp.RobinhoodBrokerageMcpTools;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ZeroMockAndCriticGateTest {

    @Test
    void shouldRejectOrderWhenCriticApprovalSignatureIsMissing() {
        RobinhoodLiveBrokerageService service = new RobinhoodLiveBrokerageService(new ObjectMapper());
        TradeOrderRequest unsignedOrder = new TradeOrderRequest(
                UUID.randomUUID(),
                "WF-TEST-01",
                "NVDA",
                "BUY",
                "LIMIT",
                10,
                new BigDecimal("140.00"),
                new BigDecimal("135.00"),
                new BigDecimal("152.00"),
                ""
        );

        MissingCriticSignatureException ex = assertThrows(
                MissingCriticSignatureException.class,
                () -> service.submitLimitOrder(unsignedOrder)
        );
        assertTrue(ex.getMessage().contains("Missing cryptographic approval token"));
    }

    @Test
    void shouldRejectOrderWhenCriticApprovalSignatureIsInvalidFormat() {
        RobinhoodLiveBrokerageService service = new RobinhoodLiveBrokerageService(new ObjectMapper());
        TradeOrderRequest invalidOrder = new TradeOrderRequest(
                UUID.randomUUID(),
                "WF-TEST-02",
                "TSLA",
                "BUY",
                "LIMIT",
                5,
                new BigDecimal("210.00"),
                null,
                null,
                "INVALID-SIGNATURE-TOKEN"
        );

        MissingCriticSignatureException ex = assertThrows(
                MissingCriticSignatureException.class,
                () -> service.submitLimitOrder(invalidOrder)
        );
        assertTrue(ex.getMessage().contains("Invalid cryptographic approval signature format"));
    }

    @Test
    void shouldFailExplicitlyWithLiveBrokerageDisconnectedWhenCredentialsUnset() {
        RobinhoodLiveBrokerageService service = new RobinhoodLiveBrokerageService(new ObjectMapper());
        LiveBrokerageDisconnectedException ex = assertThrows(
                LiveBrokerageDisconnectedException.class,
                service::getLiveBuyingPowerAndPositions
        );
        assertTrue(ex.getMessage().contains("503 Service Unavailable - Live Market Feed Disconnected"));
    }

    @Test
    void shouldResolveRobinhoodOfficialMcpEndpointByDefault() {
        RobinhoodLiveBrokerageService service = new RobinhoodLiveBrokerageService(new ObjectMapper());
        assertEquals("https://agent.robinhood.com/mcp/trading", service.resolveRobinhoodMcpEndpoint());
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldHandleMcpJsonRpcProtocolInitializeAndToolsList() {
        ObjectMapper objectMapper = new ObjectMapper();
        RobinhoodLiveBrokerageService service = new RobinhoodLiveBrokerageService(objectMapper);
        RobinhoodBrokerageMcpTools tools = new RobinhoodBrokerageMcpTools(service);
        RobinhoodMcpServerController controller = new RobinhoodMcpServerController(tools, objectMapper);

        // Test initialize
        Map<String, Object> initReq = Map.of("jsonrpc", "2.0", "id", 1, "method", "initialize");
        ResponseEntity<Map<String, Object>> initResp = controller.handleMcpJsonRpc(initReq);
        assertNotNull(initResp.getBody());
        Map<String, Object> initResult = (Map<String, Object>) initResp.getBody().get("result");
        assertNotNull(initResult);
        assertEquals("2024-11-05", initResult.get("protocolVersion"));
        Map<String, Object> serverInfo = (Map<String, Object>) initResult.get("serverInfo");
        assertEquals("https://agent.robinhood.com/mcp/trading", serverInfo.get("upstreamMcp"));

        // Test tools/list
        Map<String, Object> listReq = Map.of("jsonrpc", "2.0", "id", 2, "method", "tools/list");
        ResponseEntity<Map<String, Object>> listResp = controller.handleMcpJsonRpc(listReq);
        assertNotNull(listResp.getBody());
        Map<String, Object> listResult = (Map<String, Object>) listResp.getBody().get("result");
        assertNotNull(listResult);
        List<Map<String, Object>> toolList = (List<Map<String, Object>>) listResult.get("tools");
        assertTrue(toolList.stream().anyMatch(t -> "place_equity_order".equals(t.get("name"))));
        assertTrue(toolList.stream().anyMatch(t -> "get_portfolio".equals(t.get("name"))));
    }
}
