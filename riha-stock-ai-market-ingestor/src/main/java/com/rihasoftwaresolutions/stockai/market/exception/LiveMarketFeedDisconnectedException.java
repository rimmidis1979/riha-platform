package com.rihasoftwaresolutions.stockai.market.exception;

public class LiveMarketFeedDisconnectedException extends RuntimeException {

    private final String provider;
    private final String ticker;

    public LiveMarketFeedDisconnectedException(String message, String provider, String ticker) {
        super(message);
        this.provider = provider;
        this.ticker = ticker;
    }

    public LiveMarketFeedDisconnectedException(String message, String provider, String ticker, Throwable cause) {
        super(message, cause);
        this.provider = provider;
        this.ticker = ticker;
    }

    public String getProvider() {
        return provider;
    }

    public String getTicker() {
        return ticker;
    }
}

