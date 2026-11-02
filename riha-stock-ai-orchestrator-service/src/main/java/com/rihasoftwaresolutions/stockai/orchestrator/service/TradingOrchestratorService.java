package com.rihasoftwaresolutions.stockai.orchestrator.service;

import com.rihasoftwaresolutions.stockai.orchestrator.entity.GlobalTradingSettingsEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.entity.StockMonitorEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.entity.TransactionRecordEntity;
import com.rihasoftwaresolutions.stockai.orchestrator.model.Enums.*;
import com.rihasoftwaresolutions.stockai.orchestrator.repository.GlobalTradingSettingsRepository;
import com.rihasoftwaresolutions.stockai.orchestrator.repository.StockMonitorRepository;
import com.rihasoftwaresolutions.stockai.orchestrator.repository.TransactionRecordRepository;
import com.rihasoftwaresolutions.stockai.orchestrator.strategy.StrategyEvaluationEngine;
import com.rihasoftwaresolutions.stockai.orchestrator.strategy.StrategyEvaluationEngine.StrategyDiagnosisResult;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class TradingOrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(TradingOrchestratorService.class);

    private final TransactionRecordRepository transactionRepo;
    private final StockMonitorRepository monitorRepo;
    private final GlobalTradingSettingsRepository settingsRepo;
    private final RobinhoodIntegrationService robinhoodService;
    private final StrategyEvaluationEngine strategyEngine;

    // Modern Java 21 Virtual Threads pool for concurrent strategy evaluations
    private final ExecutorService virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();

    @Value("${riha.stockai.orchestrator.default-user-id:ram-ai@rihasoftwaresolutions.com}")
    private String defaultUserId;

    public TradingOrchestratorService(
            TransactionRecordRepository transactionRepo,
            StockMonitorRepository monitorRepo,
            GlobalTradingSettingsRepository settingsRepo,
            RobinhoodIntegrationService robinhoodService,
            StrategyEvaluationEngine strategyEngine) {
        this.transactionRepo = transactionRepo;
        this.monitorRepo = monitorRepo;
        this.settingsRepo = settingsRepo;
        this.robinhoodService = robinhoodService;
        this.strategyEngine = strategyEngine;
    }

    @PostConstruct
    public void initDefaults() {
        if (!settingsRepo.existsById(defaultUserId)) {
            GlobalTradingSettingsEntity settings = new GlobalTradingSettingsEntity(defaultUserId);
            settings.setGlobalExecutionMode(ExecutionMode.PAPERLESS);
            settings.setAutoTradingEnabled(false);
            settingsRepo.save(settings);
            log.info("Initialized default trading settings for user {}", defaultUserId);
        }
    }

    /**
     * Synchronizes live portfolio from Robinhood, records any external direct transactions,
     * updates owned stock monitoring records, and re-evaluates open positions.
     */
    @Transactional
    public RobinhoodIntegrationService.RobinhoodPortfolioSnapshot syncPortfolioFromRobinhood(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        var snapshot = robinhoodService.fetchLivePortfolioSnapshot();

        for (var pos : snapshot.positions()) {
            String sym = pos.symbol().toUpperCase(Locale.ROOT);

            // 1. Maintain StockMonitorEntity for owned stocks
            var monitorOpt = monitorRepo.findByUserIdAndSymbol(uid, sym);
            StockMonitorEntity monitor = monitorOpt.orElseGet(() -> {
                StockMonitorEntity m = new StockMonitorEntity();
                m.setUserId(uid);
                m.setSymbol(sym);
                m.setCompanyName(sym);
                return m;
            });

            monitor.setOwned(true);
            monitor.setCurrentPrice(pos.currentPrice());

            // Run real-time strategy evaluation on owned stock
            var diag = strategyEngine.evaluate(
                    sym,
                    pos.currentPrice(),
                    pos.averageCost(),
                    monitor.getTargetProfitMarginPct(),
                    monitor.getStopLossMarginPct()
            );

            monitor.setLatestRecommendation(diag.recommendation().name());
            monitor.setStrategyConfidenceScore(diag.confidenceScore());
            monitor.setStrategyDiagnosisSummary(diag.detailedNotes());
            monitor.setLastEvaluatedAt(Instant.now());
            monitorRepo.save(monitor);

            // 2. Reconcile or record initial position in TransactionRecord if not present
            var existingTxList = transactionRepo.findByUserIdAndSymbolOrderByExecutedAtDesc(uid, sym);
            if (existingTxList.isEmpty() && pos.quantity().compareTo(BigDecimal.ZERO) > 0) {
                TransactionRecordEntity directTx = new TransactionRecordEntity();
                directTx.setOrderId("RH-DIRECT-" + sym + "-" + snapshot.accountNumber());
                directTx.setUserId(uid);
                directTx.setSymbol(sym);
                directTx.setCompanyName(sym);
                directTx.setSide(OrderSide.BUY);
                directTx.setOrderType(OrderType.MARKET);
                directTx.setStatus(OrderStatus.FILLED);
                directTx.setOrigin(PurchaseOrigin.ROBINHOOD_DIRECT);
                directTx.setExecutionMode(ExecutionMode.ACTUAL);
                directTx.setQuantity(pos.quantity());
                directTx.setExecutionPrice(pos.averageCost().compareTo(BigDecimal.ZERO) > 0 ? pos.averageCost() : pos.currentPrice());
                directTx.setCurrentMarketPrice(pos.currentPrice());
                directTx.setTotalValueUsd(pos.marketValue());
                directTx.setUnrealizedPnlUsd(pos.unrealizedPnl());
                directTx.setPnlPercent(pos.unrealizedPnlPct());
                directTx.setRecommendationLabel(diag.recommendation().name());
                directTx.setStrategyName("Live Brokerage Ingestion");
                directTx.setStrategyDiagnosis(diag.detailedNotes());
                directTx.setExecutedAt(Instant.now());
                transactionRepo.save(directTx);
            } else if (!existingTxList.isEmpty()) {
                // Update live PnL on existing open transactions
                for (var tx : existingTxList) {
                    if (tx.getStatus() == OrderStatus.FILLED && tx.getClosedAt() == null) {
                        tx.setCurrentMarketPrice(pos.currentPrice());
                        if (tx.getExecutionPrice().compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal unPnl = pos.currentPrice().subtract(tx.getExecutionPrice()).multiply(tx.getQuantity());
                            BigDecimal pnlPct = pos.currentPrice().subtract(tx.getExecutionPrice())
                                    .divide(tx.getExecutionPrice(), 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100));
                            tx.setUnrealizedPnlUsd(unPnl);
                            tx.setPnlPercent(pnlPct);
                            tx.setRecommendationLabel(diag.recommendation().name());
                            tx.setStrategyDiagnosis(diag.detailedNotes());
                        }
                        transactionRepo.save(tx);
                    }
                }
            }
        }
        return snapshot;
    }

    /**
     * Periodic scanner running in background via Virtual Threads:
     * Scans all continuous monitored stocks and owned stocks, runs strategy evaluations,
     * updates buy/sell/hold recommendation labels, and triggers auto-trades if enabled.
     */
    @Scheduled(fixedDelayString = "${riha.stockai.orchestrator.periodic-scan-interval-seconds:15}000")
    public void periodicOrderAndStrategyScanner() {
        try {
            List<StockMonitorEntity> activeMonitors = monitorRepo.findByIsContinuousMonitorTrue();
            if (activeMonitors.isEmpty()) {
                return;
            }

            GlobalTradingSettingsEntity settings = getOrCreateSettings(defaultUserId);
            boolean globalAutoTrading = settings.isAutoTradingEnabled();
            ExecutionMode globalMode = settings.getGlobalExecutionMode();

            log.debug("Running periodic strategy scan across {} monitored stocks (AutoTrading={}, Mode={})",
                    activeMonitors.size(), globalAutoTrading, globalMode);

            // Execute concurrent evaluation using virtual threads
            for (StockMonitorEntity monitor : activeMonitors) {
                virtualThreadExecutor.submit(() -> evaluateSingleStockAndAutoTrade(monitor, globalAutoTrading, globalMode));
            }
        } catch (Exception ex) {
            log.error("Periodic strategy scanner error: {}", ex.getMessage());
        }
    }

    private void evaluateSingleStockAndAutoTrade(StockMonitorEntity monitor, boolean globalAutoTrading, ExecutionMode globalMode) {
        try {
            String sym = monitor.getSymbol();
            BigDecimal price = monitor.getCurrentPrice();
            if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
                price = fetchCurrentPriceFallback(sym);
                monitor.setCurrentPrice(price);
            }

            StrategyDiagnosisResult diag = strategyEngine.evaluate(
                    sym,
                    price,
                    null, // evaluated dynamically
                    monitor.getTargetProfitMarginPct(),
                    monitor.getStopLossMarginPct()
            );

            monitor.setLatestRecommendation(diag.recommendation().name());
            monitor.setStrategyConfidenceScore(diag.confidenceScore());
            monitor.setStrategyDiagnosisSummary(diag.detailedNotes());
            monitor.setLastEvaluatedAt(Instant.now());
            monitorRepo.save(monitor);

            // Auto-trading execution condition:
            if (globalAutoTrading && monitor.isAutoBuyEnabled() && diag.recommendation() == StrategyRecommendation.BUY && !monitor.isOwned()) {
                executeOrder(
                        monitor.getUserId(),
                        sym,
                        OrderSide.BUY,
                        OrderType.MARKET,
                        monitor.getMaxBuyQuantity(),
                        price,
                        globalMode,
                        "Auto-trading strategy triggered: " + diag.primaryReason()
                );
            } else if (globalAutoTrading && monitor.isAutoSellEnabled() && diag.recommendation() == StrategyRecommendation.SELL && monitor.isOwned()) {
                executeOrder(
                        monitor.getUserId(),
                        sym,
                        OrderSide.SELL,
                        OrderType.MARKET,
                        monitor.getMaxBuyQuantity(),
                        price,
                        globalMode,
                        "Auto-trading strategy triggered: " + diag.primaryReason()
                );
            }
        } catch (Exception ex) {
            log.warn("Evaluation failed for {}: {}", monitor.getSymbol(), ex.getMessage());
        }
    }

    /**
     * Executes an order (either ACTUAL or PAPERLESS), stores transaction record with origin & mode,
     * and manages P&L tracking.
     */
    @Transactional
    public TransactionRecordEntity executeOrder(
            String userId,
            String symbol,
            OrderSide side,
            OrderType orderType,
            BigDecimal quantity,
            BigDecimal limitPrice,
            ExecutionMode requestedMode,
            String notes) {

        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        GlobalTradingSettingsEntity settings = getOrCreateSettings(uid);
        ExecutionMode mode = requestedMode != null ? requestedMode : settings.getGlobalExecutionMode();

        BigDecimal execPrice = (limitPrice != null && limitPrice.compareTo(BigDecimal.ZERO) > 0)
                ? limitPrice
                : fetchCurrentPriceFallback(symbol);

        BigDecimal totalValue = execPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        String orderId;

        if (mode == ExecutionMode.ACTUAL) {
            // Trigger actual live order on Robinhood MCP
            var rbOrder = robinhoodService.executeActualRobinhoodOrder(symbol, side, orderType, quantity, execPrice);
            orderId = rbOrder.orderId();
        } else {
            // Paperless simulated execution
            orderId = "SIM-PAPER-" + UUID.randomUUID().toString().substring(0, 8);
        }

        TransactionRecordEntity tx = new TransactionRecordEntity();
        tx.setOrderId(orderId);
        tx.setUserId(uid);
        tx.setSymbol(symbol.toUpperCase(Locale.ROOT));
        tx.setCompanyName(symbol.toUpperCase(Locale.ROOT));
        tx.setSide(side);
        tx.setOrderType(orderType);
        tx.setStatus(OrderStatus.FILLED);
        tx.setOrigin(PurchaseOrigin.RIHA_APP);
        tx.setExecutionMode(mode);
        tx.setQuantity(quantity);
        tx.setExecutionPrice(execPrice);
        tx.setTargetLimitPrice(limitPrice);
        tx.setTotalValueUsd(totalValue);
        tx.setCurrentMarketPrice(execPrice);
        tx.setUnrealizedPnlUsd(BigDecimal.ZERO);
        tx.setRealizedPnlUsd(BigDecimal.ZERO);
        tx.setPnlPercent(BigDecimal.ZERO);
        tx.setRecommendationLabel(side == OrderSide.BUY ? "BUY" : "SELL");
        tx.setStrategyName("RIHA Orchestrator Engine");
        tx.setStrategyDiagnosis("Order executed via " + mode + " mode (" + tx.getOrigin() + ")");
        tx.setNotes(notes);
        tx.setExecutedAt(Instant.now());

        if (side == OrderSide.SELL) {
            tx.setClosedAt(Instant.now());
            // Calculate realized PnL against past buy orders
            calculateAndApplyRealizedPnl(uid, symbol, quantity, execPrice, tx);
        }

        TransactionRecordEntity saved = transactionRepo.save(tx);

        // Update monitor state
        var monitorOpt = monitorRepo.findByUserIdAndSymbol(uid, symbol);
        if (monitorOpt.isPresent()) {
            StockMonitorEntity m = monitorOpt.get();
            if (side == OrderSide.BUY) {
                m.setOwned(true);
            }
            m.setCurrentPrice(execPrice);
            monitorRepo.save(m);
        }

        log.info("Recorded {} transaction {} for {} (mode={}, origin={})",
                side, orderId, symbol, mode, tx.getOrigin());
        return saved;
    }

    private void calculateAndApplyRealizedPnl(String userId, String symbol, BigDecimal sellQty, BigDecimal sellPrice, TransactionRecordEntity sellTx) {
        List<TransactionRecordEntity> buys = transactionRepo.findByUserIdAndSymbolOrderByExecutedAtDesc(userId, symbol);
        for (var b : buys) {
            if (b.getSide() == OrderSide.BUY && b.getStatus() == OrderStatus.FILLED && b.getClosedAt() == null) {
                BigDecimal buyPrice = b.getExecutionPrice();
                BigDecimal profitPerShare = sellPrice.subtract(buyPrice);
                BigDecimal totalRealized = profitPerShare.multiply(sellQty).setScale(2, RoundingMode.HALF_UP);
                sellTx.setRealizedPnlUsd(totalRealized);

                if (buyPrice.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal pnlPct = profitPerShare.divide(buyPrice, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
                    sellTx.setPnlPercent(pnlPct);
                }
                b.setClosedAt(Instant.now());
                transactionRepo.save(b);
                break;
            }
        }
    }

    public List<TransactionRecordEntity> getTransactionHistory(String userId, ExecutionMode modeFilter, PurchaseOrigin originFilter, String timeRangeCode) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        Instant since = calculateSinceTimestamp(timeRangeCode);

        List<TransactionRecordEntity> list;
        if (since != null) {
            list = transactionRepo.findByUserIdAndExecutedAfter(uid, since);
        } else {
            list = transactionRepo.findByUserIdOrderByExecutedAtDesc(uid);
        }

        return list.stream()
                .filter(t -> modeFilter == null || t.getExecutionMode() == modeFilter)
                .filter(t -> originFilter == null || t.getOrigin() == originFilter)
                .toList();
    }

    public Map<String, Object> calculatePnlSummary(String userId, String timeRangeCode) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        Instant since = calculateSinceTimestamp(timeRangeCode);
        Instant effectiveSince = since != null ? since : Instant.EPOCH;

        BigDecimal actualRealized = transactionRepo.sumRealizedPnlByUserIdAndModeSince(uid, ExecutionMode.ACTUAL, effectiveSince);
        BigDecimal actualUnrealized = transactionRepo.sumUnrealizedPnlByUserIdAndMode(uid, ExecutionMode.ACTUAL);
        BigDecimal actualTotal = actualRealized.add(actualUnrealized);

        BigDecimal paperRealized = transactionRepo.sumRealizedPnlByUserIdAndModeSince(uid, ExecutionMode.PAPERLESS, effectiveSince);
        BigDecimal paperUnrealized = transactionRepo.sumUnrealizedPnlByUserIdAndMode(uid, ExecutionMode.PAPERLESS);
        BigDecimal paperTotal = paperRealized.add(paperUnrealized);

        return Map.of(
                "timeRange", timeRangeCode != null ? timeRangeCode : "ALL",
                "actualTrading", Map.of(
                        "realizedPnlUsd", actualRealized,
                        "unrealizedPnlUsd", actualUnrealized,
                        "totalPnlUsd", actualTotal
                ),
                "paperlessTrading", Map.of(
                        "realizedPnlUsd", paperRealized,
                        "unrealizedPnlUsd", paperUnrealized,
                        "totalPnlUsd", paperTotal
                ),
                "retrievedAt", Instant.now().toString()
        );
    }

    private Instant calculateSinceTimestamp(String code) {
        if (code == null) return null;
        Instant now = Instant.now();
        return switch (code.toUpperCase(Locale.ROOT)) {
            case "1D" -> now.minus(1, ChronoUnit.DAYS);
            case "1W" -> now.minus(7, ChronoUnit.DAYS);
            case "1M" -> now.minus(30, ChronoUnit.DAYS);
            case "1Y" -> now.minus(365, ChronoUnit.DAYS);
            default -> null; // ALL
        };
    }

    public GlobalTradingSettingsEntity getOrCreateSettings(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        return settingsRepo.findById(uid).orElseGet(() -> {
            GlobalTradingSettingsEntity s = new GlobalTradingSettingsEntity(uid);
            return settingsRepo.save(s);
        });
    }

    public GlobalTradingSettingsEntity updateSettings(String userId, ExecutionMode mode, Boolean autoTrading) {
        GlobalTradingSettingsEntity s = getOrCreateSettings(userId);
        if (mode != null) s.setGlobalExecutionMode(mode);
        if (autoTrading != null) s.setAutoTradingEnabled(autoTrading);
        return settingsRepo.save(s);
    }

    public StockMonitorEntity addStockToMonitor(
            String userId,
            String symbol,
            String companyName,
            boolean isContinuous,
            boolean autoBuy,
            boolean autoSell,
            BigDecimal profitMargin,
            BigDecimal stopLossMargin,
            BigDecimal maxQty,
            ExecutionMode mode) {

        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        String sym = symbol.trim().toUpperCase(Locale.ROOT);

        StockMonitorEntity m = monitorRepo.findByUserIdAndSymbol(uid, sym).orElseGet(StockMonitorEntity::new);
        m.setUserId(uid);
        m.setSymbol(sym);
        m.setCompanyName(companyName != null && !companyName.isBlank() ? companyName : sym);
        m.setContinuousMonitor(isContinuous);
        m.setAutoBuyEnabled(autoBuy);
        m.setAutoSellEnabled(autoSell);
        if (profitMargin != null) m.setTargetProfitMarginPct(profitMargin);
        if (stopLossMargin != null) m.setStopLossMarginPct(stopLossMargin);
        if (maxQty != null) m.setMaxBuyQuantity(maxQty);
        if (mode != null) m.setExecutionMode(mode);

        BigDecimal price = fetchCurrentPriceFallback(sym);
        m.setCurrentPrice(price);

        var diag = strategyEngine.evaluate(sym, price, null, m.getTargetProfitMarginPct(), m.getStopLossMarginPct());
        m.setLatestRecommendation(diag.recommendation().name());
        m.setStrategyConfidenceScore(diag.confidenceScore());
        m.setStrategyDiagnosisSummary(diag.detailedNotes());
        m.setLastEvaluatedAt(Instant.now());

        return monitorRepo.save(m);
    }

    public List<StockMonitorEntity> getMonitoredStocks(String userId) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        return monitorRepo.findByUserIdOrderBySymbolAsc(uid);
    }

    @Transactional
    public void deleteMonitoredStock(String userId, String symbol) {
        String uid = (userId != null && !userId.isBlank()) ? userId : defaultUserId;
        monitorRepo.deleteByUserIdAndSymbol(uid, symbol.trim().toUpperCase(Locale.ROOT));
    }

    public StrategyDiagnosisResult getLiveStrategyDiagnosis(String symbol) {
        String sym = symbol.trim().toUpperCase(Locale.ROOT);
        BigDecimal price = fetchCurrentPriceFallback(sym);
        return strategyEngine.evaluate(sym, price, null, new BigDecimal("5.00"), new BigDecimal("3.00"));
    }

    private BigDecimal fetchCurrentPriceFallback(String symbol) {
        try {
            var snapshot = robinhoodService.fetchLivePortfolioSnapshot();
            for (var pos : snapshot.positions()) {
                if (symbol.equalsIgnoreCase(pos.symbol())) {
                    return pos.currentPrice();
                }
            }
        } catch (Exception ignored) {}

        // Fallback default price for well-known tickers
        if ("BTC-USD".equalsIgnoreCase(symbol)) return new BigDecimal("76770.00");
        if ("NVDA".equalsIgnoreCase(symbol)) return new BigDecimal("138.50");
        if ("AAPL".equalsIgnoreCase(symbol)) return new BigDecimal("225.20");
        if ("TSLA".equalsIgnoreCase(symbol)) return new BigDecimal("250.00");
        if ("MSFT".equalsIgnoreCase(symbol)) return new BigDecimal("415.80");
        return new BigDecimal("100.00");
    }
}

