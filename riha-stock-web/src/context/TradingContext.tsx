import React, { createContext, useContext, useState, useEffect } from 'react';
import { Holding, TradeOrder, Timeframe, PerformanceDataPoint, PortfolioSummary, OrderType } from '../types/trading';
import { TrendingStock, TrendingFilters } from '../types/trending';
import { useAuth } from './AuthContext';
import { StockApiClient } from '../services/stockApiClient';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface TradingContextType {
  holdings: Holding[];
  tradeHistory: TradeOrder[];
  trendingStocks: TrendingStock[];
  personalizedWatchlist: TrendingStock[];
  filters: TrendingFilters;
  setFilters: React.Dispatch<React.SetStateAction<TrendingFilters>>;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  performanceData: PerformanceDataPoint[];
  portfolioSummary: PortfolioSummary;
  selectedStockForTrade: { symbol: string; companyName: string; currentPrice: number; defaultSide?: 'BUY' | 'SELL' } | null;
  openTradeModal: (stock: { symbol: string; companyName: string; currentPrice: number; defaultSide?: 'BUY' | 'SELL' }) => void;
  closeTradeModal: () => void;
  executeBuy: (symbol: string, companyName: string, shares: number, price: number, orderType: OrderType) => Promise<boolean>;
  executeSell: (symbol: string, companyName: string, shares: number, price: number, orderType: OrderType) => Promise<boolean>;
  togglePersonalizedStock: (symbol: string) => void;
  fetchTrendingWithFilters: (customFilters?: Partial<TrendingFilters>) => Promise<void>;
  runPromptStrategyShortlist: () => Promise<void>;
  isScanning: boolean;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const HOLDINGS_STORAGE_KEY = 'riha_stock_holdings_live';
const HISTORY_STORAGE_KEY = 'riha_stock_history_live';
const WATCHLIST_STORAGE_KEY = 'riha_stock_watchlist_personalized';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateCashBalance, isAuthenticated } = useAuth();

  // Holdings state (empty initially, updated by real trades or live backend)
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem(HOLDINGS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Trade History
  const [tradeHistory, setTradeHistory] = useState<TradeOrder[]>(() => {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Trending Stocks (loaded dynamically from strategy-service/market-ingestor)
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Personalized Watchlist symbols
  const [personalizedSymbols, setPersonalizedSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Base Filters: default limit = 25, price range = 0.00 to 1500.00
  const [filters, setFilters] = useState<TrendingFilters>({
    searchQuery: '',
    minPrice: 0.00,
    maxPrice: 1500.00,
    limit: 25,
    sentiment: 'ALL',
    filingType: 'ALL',
    aiPrediction: 'ALL',
    sector: 'ALL',
    onlyPersonalized: false,
    algorithm: 'TOP_GAINERS_DAY',
  });

  // Timeframe for performance
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  // Trade modal state
  const [selectedStockForTrade, setSelectedStockForTrade] = useState<{
    symbol: string;
    companyName: string;
    currentPrice: number;
    defaultSide?: 'BUY' | 'SELL';
  } | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(personalizedSymbols));
  }, [personalizedSymbols]);

  // Load backend holdings on auth
  useEffect(() => {
    if (isAuthenticated) {
      StockApiClient.getHoldings().then((apiHoldings) => {
        if (apiHoldings && apiHoldings.length > 0) {
          const mapped: Holding[] = apiHoldings.map((h: any) => ({
            symbol: h.symbol,
            name: h.companyName || h.name || h.symbol,
            shares: h.shares,
            avgCost: h.avgPrice || h.avgCost || 0,
            currentPrice: h.currentPrice || 0,
            equity: h.equity || (h.shares * h.currentPrice),
            totalGain: h.totalReturn || h.totalGain || 0,
            totalGainPercent: h.totalReturnPercent || h.totalGainPercent || 0,
            dayGain: h.dayReturn || h.dayGain || 0,
            dayGainPercent: h.dayReturnPercent || h.dayGainPercent || 0,
            allocationPercent: h.allocationPercent || 0,
            sector: h.sector || 'Equities',
          }));
          setHoldings(mapped);
        }
      }).catch(console.warn);
    }
  }, [isAuthenticated]);

  // Fetch trending stocks with base filters
  const fetchTrendingWithFilters = async (customFilters?: Partial<TrendingFilters>) => {
    const activeFilters = { ...filters, ...(customFilters || {}) };
    setIsScanning(true);
    try {
      const stocks = await StockApiClient.getTrendingStocks(activeFilters);
      const enriched = stocks.map((s) => ({
        ...s,
        isPersonalized: personalizedSymbols.includes(s.symbol),
      }));
      setTrendingStocks(enriched);
    } catch (err: any) {
      console.error('Failed to fetch trending stocks:', err);
      addToast('error', 'Market Feed Error', 'Unable to retrieve live market movers from backend services.');
    } finally {
      setIsScanning(false);
    }
  };

  // Initial fetch of 25 stocks on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTrendingWithFilters();
    }
  }, [isAuthenticated, filters.limit, filters.algorithm]);

  // Run Momentum Trading Analyst reasoning prompt on all fetched stocks with RAG integration
  const runPromptStrategyShortlist = async () => {
    setIsScanning(true);
    addToast('info', 'Running Strategy & Ingestions', 'Querying RAG momentum playbooks and applying 5-input reasoning prompt across shortlisted stocks...');
    try {
      const ragSnippets = await StockApiClient.queryRagPlaybooks('momentum trading vwap rvol sec catalyst');

      let candidates = trendingStocks;
      if (candidates.length === 0) {
        candidates = await StockApiClient.getTrendingStocks(filters);
      }

      const evaluated: TrendingStock[] = await Promise.all(
        candidates.map(async (stock) => {
          const decision = await StockApiClient.runMomentumPromptAnalysis(stock, ragSnippets);
          const aiPred = (decision.action === 'BUY'
            ? (decision.confidence > 0.85 ? 'STRONG_BUY' : 'BUY')
            : (decision.action === 'HOLD' ? 'HOLD' : 'NO_ACTION')) as any;
          return {
            ...stock,
            isPersonalized: personalizedSymbols.includes(stock.symbol),
            promptDecision: decision,
            aiPrediction: aiPred,
            aiConfidence: Math.round(decision.confidence * 100),
          };
        })
      );

      evaluated.sort((a, b) => (b.promptDecision?.confidence ?? 0) - (a.promptDecision?.confidence ?? 0));
      setTrendingStocks(evaluated);
      addToast('success', 'Strategy Evaluation Complete', `Shortlisted ${evaluated.length} stocks via Agentic Momentum Prompt and RAG Playbooks.`);
    } catch (err: any) {
      console.error('Strategy pipeline error:', err);
      addToast('error', 'Strategy Error', 'Failed to complete prompt strategy evaluation.');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle stock in personalized selection
  const togglePersonalizedStock = (symbol: string) => {
    const upper = symbol.toUpperCase();
    const isCurrentlyPersonalized = personalizedSymbols.includes(upper);
    const updated = isCurrentlyPersonalized
      ? personalizedSymbols.filter((s) => s !== upper)
      : [...personalizedSymbols, upper];

    setPersonalizedSymbols(updated);
    setTrendingStocks((prev) =>
      prev.map((stock) => (stock.symbol === upper ? { ...stock, isPersonalized: !isCurrentlyPersonalized } : stock))
    );

    addToast(
      'success',
      isCurrentlyPersonalized ? 'Removed from Selection' : 'Added to Personalized Selection',
      `${upper} has been ${isCurrentlyPersonalized ? 'removed from' : 'pinned to'} your personalized watchlist.`
    );
  };

  const personalizedWatchlist = trendingStocks.filter((s) => personalizedSymbols.includes(s.symbol));

  // Portfolio calculations
  const totalEquity = holdings.reduce((sum, h) => sum + h.equity, 0);
  const cashBalance = user ? user.cashBalance : 0.0;
  const totalPortfolioValue = totalEquity + cashBalance;
  const buyingPower = user ? user.buyingPower : 0.0;

  const todayGain = holdings.reduce((sum, h) => sum + h.dayGain, 0);
  const todayGainPercent = totalPortfolioValue > 0 ? (todayGain / totalPortfolioValue) * 100 : 0;
  const allTimeGain = holdings.reduce((sum, h) => sum + h.totalGain, 0);
  const allTimeGainPercent = totalPortfolioValue > 0 ? (allTimeGain / (totalPortfolioValue - allTimeGain || 1)) * 100 : 0;

  const portfolioSummary: PortfolioSummary = {
    totalEquity,
    cashBalance,
    totalPortfolioValue,
    todayGain,
    todayGainPercent,
    allTimeGain,
    allTimeGainPercent,
    holdingsCount: holdings.length,
    buyingPower,
  };

  // Performance Curve Generator - zero curve when account is new with zero equity
  const generateCurve = (equity: number, tf: Timeframe): PerformanceDataPoint[] => {
    if (equity <= 0 && holdings.length === 0) {
      return [];
    }
    const count = tf === '1D' ? 24 : tf === '1W' ? 7 : tf === '1M' ? 30 : tf === '1Y' ? 12 : 36;
    const baseVal = equity;
    const drift = tf === '1D' ? 0.006 : tf === '1W' ? 0.018 : tf === '1M' ? 0.045 : 0.16;
    const startVal = baseVal * (1 - drift);
    const now = new Date();
    const pts: PerformanceDataPoint[] = [];

    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1);
      const date = new Date(now.getTime() - (count - 1 - i) * (tf === '1D' ? 3600000 : 86400000 * (tf === '1Y' ? 30 : 1)));
      const val = Number((startVal + (baseVal - startVal) * frac).toFixed(2));
      const spyVal = Number((val * (0.95 + frac * 0.03)).toFixed(2));
      const label = tf === '1D' ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      pts.push({
        timestamp: date.toISOString(),
        label,
        portfolioValue: val,
        benchmarkValue: spyVal,
        netGain: Number((val - startVal).toFixed(2)),
        percentChange: Number((((val - startVal) / startVal) * 100).toFixed(2)),
      });
    }
    return pts;
  };

  const performanceData = generateCurve(totalPortfolioValue, timeframe);

  // Trade Modal Handlers
  const openTradeModal = (stock: { symbol: string; companyName: string; currentPrice: number; defaultSide?: 'BUY' | 'SELL' }) => {
    setSelectedStockForTrade(stock);
  };

  const closeTradeModal = () => {
    setSelectedStockForTrade(null);
  };

  // Execute Buy Order
  const executeBuy = async (
    symbol: string,
    companyName: string,
    shares: number,
    price: number,
    orderType: OrderType
  ): Promise<boolean> => {
    const totalCost = shares * price;
    if (totalCost > cashBalance) {
      addToast('error', 'Insufficient Funds', `Required: $${totalCost.toFixed(2)}, Available Cash: $${cashBalance.toFixed(2)}`);
      return false;
    }

    try {
      await StockApiClient.executeTrade({
        symbol,
        companyName,
        orderType,
        side: 'BUY',
        shares,
        price,
        totalValue: totalCost,
      });

      const executedOrder: TradeOrder = {
        id: `ORD-${Date.now()}-${symbol}`,
        symbol,
        companyName,
        side: 'BUY',
        orderType,
        shares,
        executionPrice: price,
        totalValue: totalCost,
        timestamp: new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
        status: 'FILLED',
      };

      setHoldings((prev) => {
        const existingIdx = prev.findIndex((h) => h.symbol === symbol);
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const newShares = existing.shares + shares;
          const newAvgPrice = (existing.shares * existing.avgCost + totalCost) / newShares;
          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            shares: newShares,
            avgCost: newAvgPrice,
            currentPrice: price,
            equity: newShares * price,
            dayGain: (price - newAvgPrice) * newShares,
            dayGainPercent: ((price - newAvgPrice) / newAvgPrice) * 100,
            totalGain: (price - newAvgPrice) * newShares,
            totalGainPercent: ((price - newAvgPrice) / newAvgPrice) * 100,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              symbol,
              name: companyName,
              shares,
              avgCost: price,
              currentPrice: price,
              equity: totalCost,
              dayGain: 0,
              dayGainPercent: 0,
              totalGain: 0,
              totalGainPercent: 0,
              allocationPercent: 0,
              sector: 'Equities',
            },
          ];
        }
      });

      setTradeHistory((prev) => [executedOrder, ...prev]);
      updateCashBalance(-totalCost);
      addToast('success', 'Order Executed', `Bought ${shares} shares of ${symbol} at $${price.toFixed(2)}`);
      closeTradeModal();
      return true;
    } catch (err: any) {
      addToast('error', 'Order Failed', err.message || 'Execution error');
      return false;
    }
  };

  // Execute Sell Order
  const executeSell = async (
    symbol: string,
    companyName: string,
    shares: number,
    price: number,
    orderType: OrderType
  ): Promise<boolean> => {
    const existingHolding = holdings.find((h) => h.symbol === symbol);
    if (!existingHolding || existingHolding.shares < shares) {
      addToast('error', 'Insufficient Shares', `You own ${existingHolding?.shares || 0} shares of ${symbol}.`);
      return false;
    }

    const totalProceeds = shares * price;

    try {
      await StockApiClient.executeTrade({
        symbol,
        companyName,
        orderType,
        side: 'SELL',
        shares,
        price,
        totalValue: totalProceeds,
      });

      const executedOrder: TradeOrder = {
        id: `ORD-${Date.now()}-${symbol}`,
        symbol,
        companyName,
        side: 'SELL',
        orderType,
        shares,
        executionPrice: price,
        totalValue: totalProceeds,
        timestamp: new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
        status: 'FILLED',
      };

      setHoldings((prev) => {
        return prev
          .map((h) => {
            if (h.symbol !== symbol) return h;
            const remainingShares = h.shares - shares;
            if (remainingShares <= 0) return null;
            return {
              ...h,
              shares: remainingShares,
              currentPrice: price,
              equity: remainingShares * price,
              dayGain: (price - h.avgCost) * remainingShares,
              totalGain: (price - h.avgCost) * remainingShares,
            };
          })
          .filter((h): h is Holding => h !== null);
      });

      setTradeHistory((prev) => [executedOrder, ...prev]);
      updateCashBalance(totalProceeds);
      addToast('success', 'Order Executed', `Sold ${shares} shares of ${symbol} at $${price.toFixed(2)}`);
      closeTradeModal();
      return true;
    } catch (err: any) {
      addToast('error', 'Order Failed', err.message || 'Execution error');
      return false;
    }
  };

  return (
    <TradingContext.Provider
      value={{
        holdings,
        tradeHistory,
        trendingStocks,
        personalizedWatchlist,
        filters,
        setFilters,
        timeframe,
        setTimeframe,
        performanceData,
        portfolioSummary,
        selectedStockForTrade,
        openTradeModal,
        closeTradeModal,
        executeBuy,
        executeSell,
        togglePersonalizedStock,
        fetchTrendingWithFilters,
        runPromptStrategyShortlist,
        isScanning,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = (): TradingContextType => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
