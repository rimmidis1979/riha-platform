package com.rihasoftwaresolutions.stockai.strategy.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;

@RestControllerAdvice
public class GlobalProblemDetailAdvice {

    @ExceptionHandler(LiveMarketFeedDisconnectedException.class)
    public ProblemDetail handleLiveMarketFeedDisconnected(
            LiveMarketFeedDisconnectedException ex,
            HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getMessage()
        );
        problem.setTitle("503 Service Unavailable - Live Market Feed Disconnected");
        problem.setType(URI.create("https://rihasoftwaresolutions.com/problems/live-market-feed-disconnected"));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("service", "riha-stock-ai-strategy-service");
        problem.setProperty("productId", "RIHA_STOCK_AI");
        problem.setProperty("upstreamService", ex.getUpstreamService());
        problem.setProperty("zeroMockPolicyEnforced", true);
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }

    @ExceptionHandler(InsufficientOwnedSharesException.class)
    public ProblemDetail handleInsufficientOwnedShares(
            InsufficientOwnedSharesException ex,
            HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY,
                ex.getMessage()
        );
        problem.setTitle("422 Unprocessable Entity - Position-Gated Sell Guardrail Rejection");
        problem.setType(URI.create("https://rihasoftwaresolutions.com/problems/position-gated-sell-violation"));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("service", "riha-stock-ai-strategy-service");
        problem.setProperty("productId", "RIHA_STOCK_AI");
        problem.setProperty("ticker", ex.getTicker());
        problem.setProperty("requestedQuantity", ex.getRequestedQuantity());
        problem.setProperty("ownedQuantity", ex.getOwnedQuantity());
        problem.setProperty("guardrailSpEL", "#payload.side == 'SELL' ? (#context.ownedQuantity > 0 and #payload.quantity <= #context.ownedQuantity) : true");
        problem.setProperty("deterministicGuardrailEnforced", true);
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }
}

