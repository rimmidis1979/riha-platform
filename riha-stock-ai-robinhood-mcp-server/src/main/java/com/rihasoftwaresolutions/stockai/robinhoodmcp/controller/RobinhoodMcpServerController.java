package com.rihasoftwaresolutions.stockai.robinhoodmcp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.mcp.RobinhoodBrokerageMcpTools;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.LiveBuyingPowerAndPositionsResponse;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderExecutionReceipt;
import com.rihasoftwaresolutions.stockai.robinhoodmcp.model.TradeOrderRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Robinhood MCP Server", description = "Live Robinhood Brokerage MCP Server with Critic Cryptographic Signature Enforcement")
public class RobinhoodMcpServerController {

    private final RobinhoodBrokerageMcpTools mcpTools;
    private final ObjectMapper objectMapper;

    public RobinhoodMcpServerController(RobinhoodBrokerageMcpTools mcpTools, ObjectMapper objectMapper) {
        this.mcpTools = mcpTools;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/mcp/tools/{toolName}")
    @Operation(summary = "Invoke a strictly typed @Tool operation on riha-stock-ai-robinhood-mcp-server")
    public ResponseEntity<Object> invokeMcpTool(
            @PathVariable String toolName,
            @RequestBody(required = false) Map<String, Object> arguments) {
        Map<String, Object> args = arguments != null ? arguments : Map.of();

        return switch (toolName.trim().toLowerCase(Locale.ROOT)) {
            case "getlivebuyingpowerandpositions", "getliveaccountandprofitsummary" ->
                    ResponseEntity.ok(mcpTools.getLiveAccountAndProfitSummary());
            case "submitlimitorder", "executeautotradeorder" -> {
                TradeOrderRequest orderReq = objectMapper.convertValue(args, TradeOrderRequest.class);
                yield ResponseEntity.ok(mcpTools.executeAutoTradeOrder(orderReq));
            }
            case "cancelopenorder", "cancelworkingorder" -> {
                String orderId = String.valueOf(args.getOrDefault("orderId", ""));
                yield ResponseEntity.ok(mcpTools.cancelWorkingOrder(orderId));
            }
            case "getliveorderstatus", "getorderexecutionstatus" -> {
                String orderId = String.valueOf(args.getOrDefault("orderId", ""));
                yield ResponseEntity.ok(mcpTools.getOrderExecutionStatus(orderId));
            }
            default -> throw new IllegalArgumentException("Unsupported MCP tool on riha-stock-ai-robinhood-mcp-server: " + toolName);
        };
    }

    @GetMapping("/robinhood/account")
    @Operation(summary = "Get live Robinhood buying power and open equity positions")
    public ResponseEntity<LiveBuyingPowerAndPositionsResponse> getAccount() {
        return ResponseEntity.ok(mcpTools.getLiveBuyingPowerAndPositions());
    }

    @PostMapping("/robinhood/orders")
    @Operation(summary = "Submit a live Robinhood limit order (requires valid Critic approval token)")
    public ResponseEntity<TradeOrderExecutionReceipt> submitOrder(@Valid @RequestBody TradeOrderRequest request) {
        return ResponseEntity.ok(mcpTools.submitLimitOrder(request));
    }

    @PostMapping("/robinhood/orders/{orderId}/cancel")
    @Operation(summary = "Cancel an open working Robinhood order")
    public ResponseEntity<Map<String, Object>> cancelOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(mcpTools.cancelOpenOrder(orderId));
    }

    @GetMapping("/robinhood/orders/{orderId}")
    @Operation(summary = "Get live order fill status and average fill price")
    public ResponseEntity<TradeOrderExecutionReceipt> getOrderStatus(@PathVariable String orderId) {
        return ResponseEntity.ok(mcpTools.getLiveOrderStatus(orderId));
    }
}
