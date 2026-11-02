package com.rihasoftwaresolutions.stockai.backtest.controller;

import com.rihasoftwaresolutions.stockai.backtest.model.BacktestRunConfig;
import com.rihasoftwaresolutions.stockai.backtest.model.BacktestTearsheet;
import com.rihasoftwaresolutions.stockai.backtest.service.BacktestService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/backtest")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Backtest & Simulation Engine", description = "Deterministic tick replay, slippage modeling, and institutional tearsheet metrics")
public class BacktestEngineController {

    private final BacktestService backtestService;

    public BacktestEngineController(BacktestService backtestService) {
        this.backtestService = backtestService;
    }

    @PostMapping("/run")
    @Operation(summary = "Execute deterministic historical backtest run with realistic slippage modeling")
    public ResponseEntity<BacktestTearsheet> runBacktest(@Valid @RequestBody BacktestRunConfig config) {
        return ResponseEntity.ok(backtestService.runBacktest(config));
    }

    @GetMapping("/{backtestId}/tearsheet")
    @Operation(summary = "Get complete institutional tearsheet, equity curve, and trade logs for a backtest run")
    public ResponseEntity<BacktestTearsheet> getTearsheet(@PathVariable UUID backtestId) {
        BacktestTearsheet tearsheet = backtestService.getTearsheet(backtestId);
        if (tearsheet == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(tearsheet);
    }
}

