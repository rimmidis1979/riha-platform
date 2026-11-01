package com.rihasoftwaresolutions.stockai.strategy.exception;

public class InsufficientOwnedSharesException extends RuntimeException {
    private final String ticker;
    private final int requestedQuantity;
    private final int ownedQuantity;

    public InsufficientOwnedSharesException(String ticker, int requestedQuantity, int ownedQuantity) {
        super(String.format("Position-Gated Guardrail Violation: Cannot execute SELL order for %s. Requested quantity %d exceeds active owned quantity %d (Strict Rule: #payload.side == 'SELL' ? (#context.ownedQuantity > 0 and #payload.quantity <= #context.ownedQuantity) : true)",
                ticker, requestedQuantity, ownedQuantity));
        this.ticker = ticker;
        this.requestedQuantity = requestedQuantity;
        this.ownedQuantity = ownedQuantity;
    }

    public String getTicker() {
        return ticker;
    }

    public int getRequestedQuantity() {
        return requestedQuantity;
    }

    public int getOwnedQuantity() {
        return ownedQuantity;
    }
}
