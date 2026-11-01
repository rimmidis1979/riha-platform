package com.rihasoftwaresolutions.stockai.robinhoodmcp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.exception.LiveBrokerageDisconnectedException;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.exception.MissingCriticSignatureException;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

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
    void shouldFailExplicitlyWithLiveBrokerageDisconnectedWhenCredentialsUnset() {
        RobinhoodLiveBrokerageService service = new RobinhoodLiveBrokerageService(new ObjectMapper());
        LiveBrokerageDisconnectedException ex = assertThrows(
                LiveBrokerageDisconnectedException.class,
                service::getLiveBuyingPowerAndPositions
        );
        assertTrue(ex.getMessage().contains("503 Service Unavailable - Live Market Feed Disconnected"));
    }
}

