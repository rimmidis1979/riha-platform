package com.rihasoftwaresolutions.stockai.strategy.exception;

public class LiveMarketFeedDisconnectedException extends RuntimeException {

    private final String upstreamService;

    public LiveMarketFeedDisconnectedException(String message, String upstreamService) {
        super(message);
        this.upstreamService = upstreamService;
    }

    public LiveMarketFeedDisconnectedException(String message, String upstreamService, Throwable cause) {
        super(message, cause);
        this.upstreamService = upstreamService;
    }

    public String getUpstreamService() {
        return upstreamService;
    }
}

