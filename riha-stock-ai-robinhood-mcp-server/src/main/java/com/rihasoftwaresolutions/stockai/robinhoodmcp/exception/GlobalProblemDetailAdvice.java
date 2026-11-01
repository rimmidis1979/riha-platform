package com.rihasoftwaresolutions.stockai.robinhoodmcp.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;

@RestControllerAdvice
public class GlobalProblemDetailAdvice {

    @ExceptionHandler(LiveBrokerageDisconnectedException.class)
    public ProblemDetail handleBrokerageDisconnected(
            LiveBrokerageDisconnectedException ex,
            HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getMessage()
        );
        problem.setTitle("503 Service Unavailable - Live Market Feed Disconnected");
        problem.setType(URI.create("https://rihasoftwaresolutions.com/problems/live-brokerage-feed-disconnected"));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("service", "riha-stock-ai-robinhood-mcp-server");
        problem.setProperty("productId", "RIHA_STOCK_AI");
        problem.setProperty("operation", ex.getOperation());
        problem.setProperty("zeroMockPolicyEnforced", true);
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }

    @ExceptionHandler(MissingCriticSignatureException.class)
    public ProblemDetail handleMissingCriticSignature(
            MissingCriticSignatureException ex,
            HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                ex.getMessage()
        );
        problem.setTitle("403 Forbidden - Critic Engine Cryptographic Approval Signature Required");
        problem.setType(URI.create("https://rihasoftwaresolutions.com/problems/missing-critic-approval-signature"));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("service", "riha-stock-ai-robinhood-mcp-server");
        problem.setProperty("productId", "RIHA_STOCK_AI");
        problem.setProperty("timestamp", Instant.now().toString());
        return problem;
    }
}

