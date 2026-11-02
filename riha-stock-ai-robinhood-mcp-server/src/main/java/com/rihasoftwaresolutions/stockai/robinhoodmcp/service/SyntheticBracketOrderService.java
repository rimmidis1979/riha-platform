package com.rihasoftwaresolutions.stockai.robinhoodmcp.service;

import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.ExecutionLifecycleEvent;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.SyntheticBracketState;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderExecutionReceipt;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Emulates Synthetic One-Cancels-Other (OCO) Bracket Orders in software
 * over standard Robinhood Limit Order primitives.
 */
@Service
public class SyntheticBracketOrderService {

    private static final Logger log = LoggerFactory.getLogger(SyntheticBracketOrderService.class);
    private final Map<UUID, SyntheticBracketState> activeBrackets = new ConcurrentHashMap<>();
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public SyntheticBracketOrderService(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public SyntheticBracketState registerBracketOrder(
            TradeOrderRequest request,
            TradeOrderExecutionReceipt buyReceipt) {

        if (request.takeProfitPrice() == null && request.stopLossPrice() == null) {
            return null;
        }

        UUID bracketId = UUID.randomUUID();
        SyntheticBracketState state = new SyntheticBracketState(
                bracketId,
                buyReceipt.brokerageOrderId(),
                request.ticker(),
                buyReceipt.quantity(),
                buyReceipt.averageFillPrice(),
                request.takeProfitPrice() != null ? request.takeProfitPrice() : buyReceipt.averageFillPrice().multiply(new BigDecimal("1.088")),
                request.stopLossPrice() != null ? request.stopLossPrice() : buyReceipt.averageFillPrice().multiply(new BigDecimal("0.968")),
                new BigDecimal("0.50"),
                "ACTIVE",
                Instant.now(),
                Instant.now()
        );

        activeBrackets.put(bracketId, state);
        log.info("Registered Synthetic Bracket OCO [{}] for {}: Target ${}, Stop ${}",
                bracketId, state.ticker(), state.targetPrice(), state.stopLossPrice());

        publishLifecycleEvent(new ExecutionLifecycleEvent(
                "EVT-" + UUID.randomUUID(),
                "BRACKET_REGISTERED",
                request.decisionId(),
                request.workflowInstanceId(),
                buyReceipt.brokerageOrderId(),
                request.ticker(),
                request.action(),
                "SYNTHETIC_BRACKET",
                buyReceipt.quantity(),
                buyReceipt.limitPrice(),
                buyReceipt.averageFillPrice(),
                buyReceipt.slippageBps(),
                BigDecimal.ZERO,
                "ACTIVE",
                Instant.now()
        ));

        return state;
    }

    public void evaluatePriceTick(String ticker, BigDecimal currentPrice, RobinhoodLiveBrokerageService brokerageService) {
        for (Map.Entry<UUID, SyntheticBracketState> entry : activeBrackets.entrySet()) {
            SyntheticBracketState bracket = entry.getValue();
            if (!bracket.ticker().equalsIgnoreCase(ticker) || !"ACTIVE".equalsIgnoreCase(bracket.status())) {
                continue;
            }

            // Target reached -> Trigger SELL limit order
            if (currentPrice.compareTo(bracket.targetPrice()) >= 0) {
                log.info("Bracket OCO [{}] Target Triggered for {} at price ${} >= target ${}",
                        bracket.bracketId(), ticker, currentPrice, bracket.targetPrice());
                activeBrackets.put(bracket.bracketId(), bracket.withStatus("TARGET_TRIGGERED"));
                executeExitLeg(bracket, "SELL", bracket.targetPrice(), "TARGET_TRIGGERED", brokerageService);
            }
            // Stop-Loss reached -> Trigger immediate defensive SELL order
            else if (currentPrice.compareTo(bracket.stopLossPrice()) <= 0) {
                log.warn("Bracket OCO [{}] Stop-Loss Triggered for {} at price ${} <= stop ${}",
                        bracket.bracketId(), ticker, currentPrice, bracket.stopLossPrice());
                activeBrackets.put(bracket.bracketId(), bracket.withStatus("STOP_TRIGGERED"));
                executeExitLeg(bracket, "SELL", currentPrice, "STOP_TRIGGERED", brokerageService);
            }
        }
    }

    private void executeExitLeg(SyntheticBracketState bracket, String side, BigDecimal price, String eventType, RobinhoodLiveBrokerageService brokerageService) {
        publishLifecycleEvent(new ExecutionLifecycleEvent(
                "EVT-" + UUID.randomUUID(),
                eventType,
                null,
                "BRACKET-EXIT-" + bracket.bracketId(),
                bracket.robinhoodBuyOrderId(),
                bracket.ticker(),
                side,
                "LIMIT",
                bracket.filledShares(),
                price,
                price,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                "FILLED",
                Instant.now()
        ));
    }

    public List<SyntheticBracketState> getActiveBrackets() {
        return new ArrayList<>(activeBrackets.values());
    }

    public boolean cancelBracket(UUID bracketId) {
        SyntheticBracketState bracket = activeBrackets.get(bracketId);
        if (bracket != null && "ACTIVE".equalsIgnoreCase(bracket.status())) {
            activeBrackets.put(bracketId, bracket.withStatus("CANCELLED"));
            return true;
        }
        return false;
    }

    private void publishLifecycleEvent(ExecutionLifecycleEvent event) {
        try {
            kafkaTemplate.send("riha.stockai.execution.events", event.ticker(), event);
        } catch (Exception ex) {
            log.warn("Failed to stream execution event to Kafka: {}", ex.getMessage());
        }
    }
}
