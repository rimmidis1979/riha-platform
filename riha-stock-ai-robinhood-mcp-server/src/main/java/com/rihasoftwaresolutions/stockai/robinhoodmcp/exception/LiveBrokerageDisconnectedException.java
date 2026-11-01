package com.rihasoftwaresolutions.stockai.robinhoodmcp.exception;

public class LiveBrokerageDisconnectedException extends RuntimeException {

    private final String operation;

    public LiveBrokerageDisconnectedException(String message, String operation) {
        super(message);
        this.operation = operation;
    }

    public LiveBrokerageDisconnectedException(String message, String operation, Throwable cause) {
        super(message, cause);
        this.operation = operation;
    }

    public String getOperation() {
        return operation;
    }
}

