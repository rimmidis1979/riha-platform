package com.rihasoftwaresolutions.stockai.sentiment.service;

import com.rihasoftwaresolutions.stockai.sentiment.model.AggregatedSentimentSnapshot;
import com.rihasoftwaresolutions.stockai.sentiment.model.ScoredCatalystRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SentimentNewsService {

    private static final Logger log = LoggerFactory.getLogger(SentimentNewsService.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ConcurrentHashMap<String, AggregatedSentimentSnapshot> sentimentCache = new ConcurrentHashMap<>();

    @Value("${riha.stockai.sentiment.kafka-topic-catalysts:riha.stockai.catalysts.scored}")
    private String catalystKafkaTopic;

    public SentimentNewsService(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public AggregatedSentimentSnapshot getTickerSentimentScore(String ticker) {
        String sym = ticker != null ? ticker.trim().toUpperCase(Locale.ROOT) : "NVDA";
        return sentimentCache.computeIfAbsent(sym, s -> new AggregatedSentimentSnapshot(
                s,
                0.68,
                342,
                245,
                42,
                55,
                "BULLISH",
                0.86,
                Instant.now()
        ));
    }

    public List<ScoredCatalystRecord> getBreakingCatalysts(int limit) {
        List<ScoredCatalystRecord> catalysts = new ArrayList<>();
        catalysts.add(new ScoredCatalystRecord(
                "CAT-" + UUID.randomUUID().toString().substring(0, 8),
                "NVDA",
                "NVIDIA Secures $4.2B Sovereign AI Infrastructure Supply Agreement with Tier-1 Hyperscaler",
                "PR Newswire",
                "POSITIVE",
                0.88,
                0.94,
                "MATERIAL_CONTRACT_AWARD",
                "CRITICAL",
                true,
                Instant.now().minusSeconds(1200)
        ));
        catalysts.add(new ScoredCatalystRecord(
                "CAT-" + UUID.randomUUID().toString().substring(0, 8),
                "TSLA",
                "Tesla Reports Q3 Automotive Margin Beat, Accelerates Full Self-Driving Robotaxi Rollout Timeline",
                "GlobeNewswire",
                "POSITIVE",
                0.74,
                0.89,
                "EARNINGS_SURPRISE_BEAT_MISS",
                "HIGH",
                true,
                Instant.now().minusSeconds(2400)
        ));

        int fetchLimit = limit > 0 ? Math.min(limit, catalysts.size()) : catalysts.size();
        return catalysts.subList(0, fetchLimit);
    }

    public ScoredCatalystRecord scoreNewsHeadline(String headline, String ticker) {
        String sym = ticker != null ? ticker.trim().toUpperCase(Locale.ROOT) : "UNKNOWN";
        boolean isBullish = headline.toLowerCase().contains("beat")
                || headline.toLowerCase().contains("award")
                || headline.toLowerCase().contains("approval")
                || headline.toLowerCase().contains("record");

        double polarity = isBullish ? 0.82 : -0.65;
        String label = isBullish ? "POSITIVE" : "NEGATIVE";
        String category = isBullish ? "MATERIAL_CONTRACT_AWARD" : "DILUTION_OR_REORGANIZATION";
        String urgency = isBullish ? "CRITICAL" : "HIGH";

        ScoredCatalystRecord record = new ScoredCatalystRecord(
                "CAT-" + UUID.randomUUID().toString().substring(0, 8),
                sym,
                headline,
                "Financial Wire Ingestor",
                label,
                polarity,
                0.91,
                category,
                urgency,
                isBullish,
                Instant.now()
        );

        try {
            kafkaTemplate.send(catalystKafkaTopic, sym, record);
            log.info("Emitted ScoredCatalystRecord to Kafka topic {}: {} ({})", catalystKafkaTopic, sym, label);
        } catch (Exception ex) {
            log.warn("Failed to publish scored catalyst to Kafka: {}", ex.getMessage());
        }

        return record;
    }
}
