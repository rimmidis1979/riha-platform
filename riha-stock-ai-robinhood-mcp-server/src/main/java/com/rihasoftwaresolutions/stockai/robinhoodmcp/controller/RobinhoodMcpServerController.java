package com.rihasoftwaresolutions.stockai.robinhoodmcp.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.mcp.RobinhoodBrokerageMcpTools;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.LiveBuyingPowerAndPositionsResponse;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderExecutionReceipt;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Robinhood MCP Server", description = "Live Robinhood Brokerage MCP Server integrating with official agent.robinhood.com/mcp/trading")
public class RobinhoodMcpServerController {

    private final RobinhoodBrokerageMcpTools mcpTools;
    private final ObjectMapper objectMapper;

    public RobinhoodMcpServerController(RobinhoodBrokerageMcpTools mcpTools, ObjectMapper objectMapper) {
        this.mcpTools = mcpTools;
        this.objectMapper = objectMapper;
    }

    /**
     * Standard Model Context Protocol (MCP) JSON-RPC 2.0 endpoint over HTTP.
     * Compatible with Claude, Cursor, AI agents, and RIHA MCP Gateway.
     */
    @PostMapping(value = {"/mcp", "/mcp/trading", "/api/v1/mcp"}, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Model Context Protocol (MCP) JSON-RPC 2.0 Streamable HTTP endpoint")
    public ResponseEntity<Map<String, Object>> handleMcpJsonRpc(@RequestBody Map<String, Object> request) {
        Object id = request.getOrDefault("id", 1);
        String method = String.valueOf(request.getOrDefault("method", ""));
        @SuppressWarnings("unchecked")
        Map<String, Object> params = (Map<String, Object>) request.getOrDefault("params", Map.of());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("jsonrpc", "2.0");
        response.put("id", id);

        try {
            switch (method) {
                case "initialize" -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("protocolVersion", "2024-11-05");
                    result.put("capabilities", Map.of("tools", Map.of("listChanged", false)));
                    result.put("serverInfo", Map.of(
                            "name", "riha-stock-ai-robinhood-mcp-server",
                            "version", "1.0.0",
                            "description", "Robinhood Agentic Trading MCP Gateway with Cryptographic Critic Guard",
                            "upstreamMcp", "https://agent.robinhood.com/mcp/trading"
                    ));
                    response.put("result", result);
                }
                case "tools/list" -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("tools", buildAvailableMcpToolsList());
                    response.put("result", result);
                }
                case "tools/call" -> {
                    String toolName = String.valueOf(params.getOrDefault("name", ""));
                    @SuppressWarnings("unchecked")
                    Map<String, Object> args = (Map<String, Object>) params.getOrDefault("arguments", Map.of());
                    Object output = executeMcpToolInternal(toolName, args);

                    String textResult;
                    if (output instanceof String str) {
                        textResult = str;
                    } else {
                        textResult = objectMapper.writeValueAsString(output);
                    }

                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("content", List.of(Map.of("type", "text", "text", textResult)));
                    result.put("isError", false);
                    response.put("result", result);
                }
                case "ping" -> response.put("result", Map.of());
                default -> {
                    Map<String, Object> error = new LinkedHashMap<>();
                    error.put("code", -32601);
                    error.put("message", "Method not found: " + method);
                    response.put("error", error);
                }
            }
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("code", -32000);
            error.put("message", ex.getMessage());
            response.put("error", error);
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping("/api/v1/mcp/tools/{toolName}")
    @Operation(summary = "Invoke a strictly typed @Tool operation on riha-stock-ai-robinhood-mcp-server")
    public ResponseEntity<Object> invokeMcpTool(
            @PathVariable String toolName,
            @RequestBody(required = false) Map<String, Object> arguments) {
        Map<String, Object> args = arguments != null ? arguments : Map.of();
        Object output = executeMcpToolInternal(toolName, args);
        return ResponseEntity.ok(output);
    }

    @GetMapping("/api/v1/robinhood/account")
    @Operation(summary = "Get live Robinhood buying power and open equity positions")
    public ResponseEntity<LiveBuyingPowerAndPositionsResponse> getAccount() {
        return ResponseEntity.ok(mcpTools.getLiveBuyingPowerAndPositions());
    }

    @PostMapping("/api/v1/robinhood/orders")
    @Operation(summary = "Submit a live Robinhood limit order (requires valid Critic approval token)")
    public ResponseEntity<TradeOrderExecutionReceipt> submitOrder(@Valid @RequestBody TradeOrderRequest request) {
        return ResponseEntity.ok(mcpTools.submitLimitOrder(request));
    }

    @PostMapping("/api/v1/robinhood/orders/{orderId}/cancel")
    @Operation(summary = "Cancel an open working Robinhood order")
    public ResponseEntity<Map<String, Object>> cancelOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(mcpTools.cancelOpenOrder(orderId));
    }

    @GetMapping("/api/v1/robinhood/orders/{orderId}")
    @Operation(summary = "Get live order fill status and average fill price")
    public ResponseEntity<TradeOrderExecutionReceipt> getOrderStatus(@PathVariable String orderId) {
        return ResponseEntity.ok(mcpTools.getLiveOrderStatus(orderId));
    }

    @PostMapping("/api/v1/robinhood/mcp/proxy")
    @Operation(summary = "Proxy raw MCP tool calls to upstream Robinhood MCP server (https://agent.robinhood.com/mcp/trading)")
    public ResponseEntity<Map<String, Object>> proxyMcpCall(@RequestBody Map<String, Object> request) {
        String toolName = String.valueOf(request.getOrDefault("toolName", "get_portfolio"));
        @SuppressWarnings("unchecked")
        Map<String, Object> args = (Map<String, Object>) request.getOrDefault("arguments", Map.of());
        String criticSig = String.valueOf(request.getOrDefault("criticSignature", ""));
        return ResponseEntity.ok(mcpTools.invokeRobinhoodMcpTool(toolName, args, criticSig));
    }

    private Object executeMcpToolInternal(String toolName, Map<String, Object> args) {
        return switch (toolName.trim().toLowerCase(Locale.ROOT)) {
            case "getlivebuyingpowerandpositions", "getliveaccountandprofitsummary", "get_portfolio", "get_accounts" ->
                    mcpTools.getLiveAccountAndProfitSummary();
            case "submitlimitorder", "executeautotradeorder", "place_equity_order" -> {
                TradeOrderRequest orderReq = parseTradeOrderRequest(args);
                yield mcpTools.executeAutoTradeOrder(orderReq);
            }
            case "cancelopenorder", "cancelworkingorder", "cancel_equity_order" -> {
                String orderId = String.valueOf(args.getOrDefault("order_id", args.getOrDefault("orderId", "")));
                yield mcpTools.cancelWorkingOrder(orderId);
            }
            case "getliveorderstatus", "getorderexecutionstatus", "get_equity_order", "get_order_status" -> {
                String orderId = String.valueOf(args.getOrDefault("order_id", args.getOrDefault("orderId", "")));
                yield mcpTools.getOrderExecutionStatus(orderId);
            }
            default -> {
                String criticSig = String.valueOf(args.getOrDefault("criticApprovalToken", args.getOrDefault("criticSignature", "")));
                yield mcpTools.invokeRobinhoodMcpTool(toolName, args, criticSig);
            }
        };
    }

    private TradeOrderRequest parseTradeOrderRequest(Map<String, Object> args) {
        try {
            return objectMapper.convertValue(args, TradeOrderRequest.class);
        } catch (Exception ex) {
            // Support direct Robinhood MCP arguments: symbol, side, quantity, price, etc.
            String ticker = String.valueOf(args.getOrDefault("symbol", args.getOrDefault("ticker", "NVDA")));
            String action = String.valueOf(args.getOrDefault("side", args.getOrDefault("action", "BUY"))).toUpperCase(Locale.ROOT);
            String orderType = String.valueOf(args.getOrDefault("order_type", args.getOrDefault("orderType", "LIMIT"))).toUpperCase(Locale.ROOT);
            int quantity = args.get("quantity") instanceof Number n ? n.intValue() : 1;
            BigDecimal price = args.get("price") != null ? new BigDecimal(String.valueOf(args.get("price")))
                    : args.get("limitPrice") != null ? new BigDecimal(String.valueOf(args.get("limitPrice")))
                    : BigDecimal.ZERO;
            String criticSig = String.valueOf(args.getOrDefault("criticApprovalToken", args.getOrDefault("criticSignature", "")));

            return new TradeOrderRequest(
                    UUID.randomUUID(),
                    "MCP-EXEC-" + ticker,
                    ticker,
                    action,
                    orderType,
                    quantity,
                    price,
                    null,
                    null,
                    criticSig
            );
        }
    }

    private List<Map<String, Object>> buildAvailableMcpToolsList() {
        List<Map<String, Object>> tools = new ArrayList<>();

        tools.add(Map.of(
                "name", "get_portfolio",
                "description", "Retrieves aggregate portfolio equity, cash buying power, unsettled funds, and open positions from live Robinhood Agentic MCP server.",
                "inputSchema", Map.of(
                        "type", "object",
                        "properties", Map.of()
                )
        ));

        tools.add(Map.of(
                "name", "get_accounts",
                "description", "Fetches active Robinhood Agentic trading account details and buying power.",
                "inputSchema", Map.of(
                        "type", "object",
                        "properties", Map.of()
                )
        ));

        tools.add(Map.of(
                "name", "place_equity_order",
                "description", "Places a live buy or sell order on Robinhood Agentic MCP server. Mandatory Cryptographic Critic signature required.",
                "inputSchema", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "symbol", Map.of("type", "string", "description", "Stock ticker symbol (e.g. NVDA)"),
                                "side", Map.of("type", "string", "enum", List.of("buy", "sell")),
                                "quantity", Map.of("type", "integer", "description", "Share count"),
                                "order_type", Map.of("type", "string", "enum", List.of("market", "limit")),
                                "price", Map.of("type", "number", "description", "Limit price"),
                                "criticApprovalToken", Map.of("type", "string", "description", "Cryptographic Critic approval signature (RIHA-CRITIC-SIG-v1...)")
                        ),
                        "required", List.of("symbol", "side", "quantity", "criticApprovalToken")
                )
        ));

        tools.add(Map.of(
                "name", "cancel_equity_order",
                "description", "Cancels an open working Robinhood brokerage order.",
                "inputSchema", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "order_id", Map.of("type", "string", "description", "Order ID to cancel")
                        ),
                        "required", List.of("order_id")
                )
        ));

        tools.add(Map.of(
                "name", "getLiveBuyingPowerAndPositions",
                "description", "Legacy RIHA tool: Returns real-time cash balance, unsettled funds, and open equity positions.",
                "inputSchema", Map.of(
                        "type", "object",
                        "properties", Map.of()
                )
        ));

        tools.add(Map.of(
                "name", "submitLimitOrder",
                "description", "Legacy RIHA tool: Executes a limit order guarded by Critic approval signature.",
                "inputSchema", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "ticker", Map.of("type", "string"),
                                "action", Map.of("type", "string"),
                                "quantity", Map.of("type", "integer"),
                                "limitPrice", Map.of("type", "number"),
                                "criticApprovalToken", Map.of("type", "string")
                        ),
                        "required", List.of("ticker", "action", "quantity", "limitPrice", "criticApprovalToken")
                )
        ));

        return tools;
    }
}
