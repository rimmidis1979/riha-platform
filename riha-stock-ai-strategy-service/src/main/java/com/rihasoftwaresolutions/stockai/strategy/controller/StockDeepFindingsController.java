package com.rihasoftwaresolutions.stockai.strategy.controller;

import com.rihasoftwaresolutions.stockai.strategy.service.StockAgenticWorkflowCoordinator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock-ai/stocks/{ticker}/findings")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Deep Findings Inspector", description = "Dedicated deep-dive findings for Technical & Order Flow, Critic Engine & SpEL Guardrails, and SEC Filings & Episodic Memory")
public class StockDeepFindingsController {

    private final StockAgenticWorkflowCoordinator workflowCoordinator;

    public StockDeepFindingsController(StockAgenticWorkflowCoordinator workflowCoordinator) {
        this.workflowCoordinator = workflowCoordinator;
    }

    @GetMapping("/technical")
    @Operation(summary = "Get deep technical findings, multi-timeframe candlestick series, quantitative indicators, and order flow metrics")
    public ResponseEntity<Map<String, Object>> getTechnicalFindings(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.getTechnicalFindings(ticker));
    }

    @GetMapping("/critic")
    @Operation(summary = "Get Critic Engine verdict, deterministic SpEL evaluated rules table (Rules 1-6), and LLM reasoning transcript")
    public ResponseEntity<Map<String, Object>> getCriticFindings(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.getCriticFindings(ticker));
    }

    @GetMapping("/sec-memory")
    @Operation(summary = "Get SEC EDGAR filings catalyst feed, dilution risk assessment, and pgvector episodic memory historical recall")
    public ResponseEntity<Map<String, Object>> getSecAndMemoryFindings(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.getSecAndMemoryFindings(ticker));
    }

    @GetMapping("/strategy-details")
    @Operation(summary = "Get algorithmic strategy configuration, prompt version from VCH, and consensus node weights")
    public ResponseEntity<Map<String, Object>> getStrategyDetails(@PathVariable String ticker) {
        return ResponseEntity.ok(workflowCoordinator.getStrategyDetails(ticker));
    }
}

