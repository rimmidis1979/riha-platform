package com.rihasoftwaresolutions.stockai.sentiment.controller;

import com.rihasoftwaresolutions.stockai.sentiment.model.AggregatedSentimentSnapshot;
import com.rihasoftwaresolutions.stockai.sentiment.model.ScoredCatalystRecord;
import com.rihasoftwaresolutions.stockai.sentiment.service.SentimentNewsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sentiment")
@CrossOrigin(origins = "*")
@Tag(name = "RIHA Stock AI Sentiment & News Service", description = "Financial wire parsing, FinBERT sentiment scoring, and breaking catalyst alerts")
public class SentimentNewsController {

    private final SentimentNewsService sentimentService;

    public SentimentNewsController(SentimentNewsService sentimentService) {
        this.sentimentService = sentimentService;
    }

    @GetMapping("/ticker/{ticker}")
    @Operation(summary = "Get aggregated 24-hour sentiment polarity [-1.0 to +1.0], mention velocity, and sentiment label for a ticker")
    public ResponseEntity<AggregatedSentimentSnapshot> getTickerSentiment(@PathVariable String ticker) {
        return ResponseEntity.ok(sentimentService.getTickerSentimentScore(ticker));
    }

    @GetMapping("/ticker/{ticker}/news")
    @Operation(summary = "Get recent breaking news wire articles and releases with timestamp for a ticker")
    public ResponseEntity<List<ScoredCatalystRecord>> getTickerNews(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(sentimentService.getNewsForTicker(ticker, limit));
    }

    @GetMapping("/catalysts/breaking")
    @Operation(summary = "Get breaking high-impact news catalysts detected across US equities within the past 60 minutes")
    public ResponseEntity<List<ScoredCatalystRecord>> getBreakingCatalysts(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(sentimentService.getBreakingCatalysts(limit));
    }

    @PostMapping("/score-headline")
    @Operation(summary = "Run on-demand FinBERT sentiment scoring on a financial news headline and publish scored event to Kafka")
    public ResponseEntity<ScoredCatalystRecord> scoreHeadline(@RequestBody Map<String, String> body) {
        String headline = body.getOrDefault("headline", "");
        String ticker = body.getOrDefault("ticker", "");
        return ResponseEntity.ok(sentimentService.scoreNewsHeadline(headline, ticker));
    }
}

