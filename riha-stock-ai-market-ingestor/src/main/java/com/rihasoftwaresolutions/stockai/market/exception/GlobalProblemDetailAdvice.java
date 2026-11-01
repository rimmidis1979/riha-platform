package com.rihasoftwaresolutions.stockai.market.exception;

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
        problem.setProperty("service", "riha-stock-ai-market-ingestor");
        problem.setProperty("productId", "RIHA_STOCK_AI");
        problem.setProperty("provider", ex.getProvider());
        problem.setProperty("ticker", ex.getTicker());
        problem.setProperty("zeroMockPolicyEnforced", true);
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }
}

