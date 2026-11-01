package com.rihasoftwaresolutions.stockai.strategy.controller;

import com.rihasoftwaresolutions.stockai.strategy.service.StockAgenticWorkflowCoordinator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock-ai/trending")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Trending & Algorithmic Scanner", description = "Live algorithmic stock discovery with real-time owned-position cross-referencing")
public class TrendingStocksController {

    private final StockAgenticWorkflowCoordinator workflowCoordinator;

    public TrendingStocksController(StockAgenticWorkflowCoordinator workflowCoordinator) {
        this.workflowCoordinator = workflowCoordinator;
    }

    @GetMapping
    @Operation(summary = "Get trending algorithmic stocks enriched with live ownership status (isOwned and ownedQuantity)")
    public ResponseEntity<List<Map<String, Object>>> getTrendingStocks(
            @RequestParam(defaultValue = "TOP_GAINERS_DAY") String filter,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(workflowCoordinator.getTrendingStocks(filter, search));
    }
}

