package com.rihasoftwaresolutions.stockai.orchestrator.model;

public class Enums {
    public enum OrderSide {
        BUY, SELL
    }

    public enum OrderType {
        MARKET, LIMIT, STOP_LOSS
    }

    public enum OrderStatus {
        FILLED, PENDING, CANCELLED, REJECTED
    }

    public enum PurchaseOrigin {
        RIHA_APP, ROBINHOOD_DIRECT
    }

    public enum ExecutionMode {
        PAPERLESS, ACTUAL
    }

    public enum StrategyRecommendation {
        BUY, SELL, HOLD
    }

    public enum TimeRange {
        ONE_DAY("1D"), ONE_WEEK("1W"), ONE_MONTH("1M"), ONE_YEAR("1Y"), ALL("ALL");

        private final String code;
        TimeRange(String code) { this.code = code; }
        public String getCode() { return code; }

        public static TimeRange fromCode(String code) {
            for (TimeRange r : values()) {
                if (r.code.equalsIgnoreCase(code) || r.name().equalsIgnoreCase(code)) {
                    return r;
                }
            }
            return ALL;
        }
    }
}

