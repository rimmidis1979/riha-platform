package com.rihasoftwaresolutions.stockai.robinhoodmcp.mcp;

import com.rihasoftwaresolutions.stockai.robinhoodmcp.annotation.Tool;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.LiveBuyingPowerAndPositionsResponse;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderExecutionReceipt;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.service.RobinhoodLiveBrokerageService;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RobinhoodBrokerageMcpTools {

    private final RobinhoodLiveBrokerageService brokerageService;

    public RobinhoodBrokerageMcpTools(RobinhoodLiveBrokerageService brokerageService) {
        this.brokerageService = brokerageService;
    }

    @Tool(
            name = "getLiveBuyingPowerAndPositions",
            description = "Returns real-time cash balance, unsettled funds, and open equity positions from live Robinhood brokerage account."
    )
    public LiveBuyingPowerAndPositionsResponse getLiveBuyingPowerAndPositions() {
        return brokerageService.getLiveBuyingPowerAndPositions();
    }

    @Tool(
            name = "getLiveAccountAndProfitSummary",
            description = "Fetches real-time portfolio equity, cash buying power, unsettled funds, open positions, today's realized/unrealized P&L, and all-time account profit."
    )
    public LiveBuyingPowerAndPositionsResponse getLiveAccountAndProfitSummary() {
        return brokerageService.getLiveBuyingPowerAndPositions();
    }

    @Tool(
            name = "get_portfolio",
            description = "Retrieves live aggregate equity value, cash balances, and overall portfolio snapshot from Robinhood Agentic MCP server."
    )
    public LiveBuyingPowerAndPositionsResponse getPortfolio() {
        return brokerageService.getLiveBuyingPowerAndPositions();
    }

    @Tool(
            name = "get_accounts",
            description = "Retrieves live account identifiers and cash balance from Robinhood Agentic MCP server."
    )
    public LiveBuyingPowerAndPositionsResponse getAccounts() {
        return brokerageService.getLiveBuyingPowerAndPositions();
    }

    @Tool(
            name = "submitLimitOrder",
            description = "Executes a live BUY or SELL limit order only when accompanied by a cryptographic approval token/signature from riha-critic-engine."
    )
    public TradeOrderExecutionReceipt submitLimitOrder(TradeOrderRequest request) {
        return brokerageService.submitLimitOrder(request);
    }

    @Tool(
            name = "executeAutoTradeOrder",
            description = "Executes a live BUY or SELL order on Robinhood ONLY when accompanied by a verified criticApprovalToken emitted by riha-critic-engine."
    )
    public TradeOrderExecutionReceipt executeAutoTradeOrder(TradeOrderRequest request) {
        return brokerageService.submitLimitOrder(request);
    }

    @Tool(
            name = "place_equity_order",
            description = "Submits a live buy/sell equity order to Robinhood Agentic MCP server with mandatory Cryptographic Critic approval signature verification."
    )
    public TradeOrderExecutionReceipt placeEquityOrder(TradeOrderRequest request) {
        return brokerageService.submitLimitOrder(request);
    }

    @Tool(
            name = "cancelOpenOrder",
            description = "Cancels an active working brokerage order."
    )
    public Map<String, Object> cancelOpenOrder(String orderId) {
        return brokerageService.cancelOpenOrder(orderId);
    }

    @Tool(
            name = "cancelWorkingOrder",
            description = "Cancels an active working brokerage order."
    )
    public Map<String, Object> cancelWorkingOrder(String orderId) {
        return brokerageService.cancelOpenOrder(orderId);
    }

    @Tool(
            name = "cancel_equity_order",
            description = "Revokes an open, unfilled equity order on Robinhood Agentic MCP server."
    )
    public Map<String, Object> cancelEquityOrder(String orderId) {
        return brokerageService.cancelOpenOrder(orderId);
    }

    @Tool(
            name = "getLiveOrderStatus",
            description = "Polls real-time fill price and execution status for a live Robinhood brokerage order."
    )
    public TradeOrderExecutionReceipt getLiveOrderStatus(String orderId) {
        return brokerageService.getLiveOrderStatus(orderId);
    }

    @Tool(
            name = "getOrderExecutionStatus",
            description = "Polls real-time fill price and execution status for a live Robinhood brokerage order."
    )
    public TradeOrderExecutionReceipt getOrderExecutionStatus(String orderId) {
        return brokerageService.getLiveOrderStatus(orderId);
    }

    @Tool(
            name = "invokeRobinhoodMcpTool",
            description = "Passes through any supported tool call to upstream Robinhood MCP server (https://agent.robinhood.com/mcp/trading) with Critic signature verification for trades."
    )
    public Map<String, Object> invokeRobinhoodMcpTool(String toolName, Map<String, Object> arguments, String criticSignature) {
        return brokerageService.invokeRobinhoodMcpToolGeneric(toolName, arguments, criticSignature);
    }
}
