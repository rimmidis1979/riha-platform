import React, { createContext, useContext, useState, useEffect } from 'react';
import { Holding, TradeOrder, Timeframe, PerformanceDataPoint, PortfolioSummary, OrderType } from '../types/trading';
import { TrendingStock } from '../types/trending';
import { INITIAL_HOLDINGS, INITIAL_TRADE_HISTORY, INITIAL_TRENDING_STOCKS, getPerformanceData } from '../services/mockData';
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
  toasts: ToastData[];
  dismissToast: (id: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const HOLDINGS_STORAGE_KEY = 'riha_stock_holdings_v1';
const HISTORY_STORAGE_KEY = 'riha_stock_history_v1';
const WATCHLIST_STORAGE_KEY = 'riha_stock_watchlist_v1';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateCashBalance } = useAuth();

  // Holdings
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem(HOLDINGS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_HOLDINGS;
  });

  // Trade History
  const [tradeHistory, setTradeHistory] = useState<TradeOrder[]>(() => {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_TRADE_HISTORY;
  });

  // Trending Stocks
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>(() => {
    const savedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    const watchlistSymbols: string[] = savedWatchlist ? JSON.parse(savedWatchlist) : ['NVDA', 'PLTR', 'TSLA', 'AAPL', 'MSFT'];
    
    return INITIAL_TRENDING_STOCKS.map((stock) => ({
      ...stock,
      isPersonalized: watchlistSymbols.includes(stock.symbol),
    }));
  });

  // Timeframe for performance
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>(() => getPerformanceData('1M'));

  // Trade modal state
  const [selectedStockForTrade, setSelectedStockForTrade] = useState<{
    symbol: string;
    companyName: string;
    currentPrice: number;
    defaultSide?: 'BUY' | 'SELL';
  } | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Add toast helper
  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  // Update performance data when timeframe changes
  useEffect(() => {
    setPerformanceData(getPerformanceData(timeframe));
  }, [timeframe]);

  // Real-time market tick simulation (subtle realistic micro-fluctuations)
  useEffect(() => {
    const interval = setInterval(() => {
      setTrendingStocks((prev) =>
        prev.map((stock) => {
          // 40% chance to update each tick
          if (Math.random() > 0.4) return stock;
          const delta = (Math.random() - 0.49) * 0.45;
          const newPrice = Math.max(1, +(stock.price + delta).toFixed(2));
          const newChange = +(stock.change + delta).toFixed(2);
          const newPercent = +((newChange / (newPrice - newChange)) * 100).toFixed(2);
          return {
            ...stock,
            price: newPrice,
            change: newChange,
            changePercent: newPercent,
          };
        })
      );

      // Also update prices in holdings
      setHoldings((prev) =>
        prev.map((h) => {
          const match = trendingStocks.find((s) => s.symbol === h.symbol);
          if (!match) return h;
          const currentPrice = match.price;
          const equity = +(h.shares * currentPrice).toFixed(2);
          const totalGain = +(equity - h.shares * h.avgCost).toFixed(2);
          const totalGainPercent = +((totalGain / (h.shares * h.avgCost)) * 100).toFixed(2);
          const dayGain = +(match.change * h.shares).toFixed(2);
          const dayGainPercent = match.changePercent;
          return {
            ...h,
            currentPrice,
            equity,
            totalGain,
            totalGainPercent,
            dayGain,
            dayGainPercent,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [trendingStocks]);

  // Compute portfolio summary metrics
  const totalEquity = holdings.reduce((sum, h) => sum + h.equity, 0);
  const cashBalance = user?.cashBalance ?? 42850.75;
  const totalPortfolioValue = totalEquity + cashBalance;
  const todayGain = holdings.reduce((sum, h) => sum + h.dayGain, 0);
  const todayGainPercent = totalEquity > 0 ? (todayGain / totalEquity) * 100 : 0;
  const allTimeGain = holdings.reduce((sum, h) => sum + h.totalGain, 0);
  const allTimeGainPercent = totalEquity > 0 ? (allTimeGain / (totalEquity - allTimeGain)) * 100 : 0;

  const portfolioSummary: PortfolioSummary = {
    totalEquity: +totalEquity.toFixed(2),
    cashBalance: +cashBalance.toFixed(2),
    totalPortfolioValue: +totalPortfolioValue.toFixed(2),
    todayGain: +todayGain.toFixed(2),
    todayGainPercent: +todayGainPercent.toFixed(2),
    allTimeGain: +allTimeGain.toFixed(2),
    allTimeGainPercent: +allTimeGainPercent.toFixed(2),
    holdingsCount: holdings.length,
  };

  // Open & Close Trade Modal
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
    const totalCost = +(shares * price).toFixed(2);

    if (totalCost > cashBalance) {
      addToast('error', 'Insufficient Funds', `Required \$${totalCost.toLocaleString()} but available cash is \$${cashBalance.toLocaleString()}`);
      return false;
    }

    // Deduct cash
    updateCashBalance(-totalCost);

    // Update holdings
    setHoldings((prev) => {
      const existing = prev.find((h) => h.symbol === symbol);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalInvested = existing.shares * existing.avgCost + totalCost;
        const avgCost = +(totalInvested / totalShares).toFixed(2);
        const equity = +(totalShares * price).toFixed(2);
        const totalGain = +(equity - totalInvested).toFixed(2);
        const totalGainPercent = +((totalGain / totalInvested) * 100).toFixed(2);

        return prev.map((h) =>
          h.symbol === symbol
            ? {
                ...h,
                shares: totalShares,
                avgCost,
                currentPrice: price,
                equity,
                totalGain,
                totalGainPercent,
              }
            : h
        );
      } else {
        const equity = totalCost;
        const newHolding: Holding = {
          symbol,
          name: companyName,
          shares,
          avgCost: price,
          currentPrice: price,
          equity,
          totalGain: 0,
          totalGainPercent: 0,
          dayGain: 0,
          dayGainPercent: 0,
          allocationPercent: 10,
          sector: 'Equities',
        };
        return [...prev, newHolding];
      }
    });

    // Record in history
    const tradeOrder = await StockApiClient.executeTrade({
      symbol,
      companyName,
      side: 'BUY',
      orderType,
      shares,
      executionPrice: price,
      totalValue: totalCost,
      notes: `${orderType} order filled via RIHA Trading Engine`,
    });

    setTradeHistory((prev) => [tradeOrder, ...prev]);

    addToast(
      'success',
      'Order Filled: BUY',
      `Purchased ${shares} shares of ${symbol} @ \$${price.toFixed(2)} (Total: \$${totalCost.toLocaleString()})`
    );

    closeTradeModal();
    return true;
  };

  // Execute Sell Order
  const executeSell = async (
    symbol: string,
    companyName: string,
    shares: number,
    price: number,
    orderType: OrderType
  ): Promise<boolean> => {
    const existing = holdings.find((h) => h.symbol === symbol);

    if (!existing || existing.shares < shares) {
      addToast('error', 'Insufficient Shares', `You own ${existing?.shares || 0} shares of ${symbol}, cannot sell ${shares}`);
      return false;
    }

    const totalProceeds = +(shares * price).toFixed(2);

    // Add proceeds to cash
    updateCashBalance(totalProceeds);

    // Update holdings
    setHoldings((prev) => {
      const current = prev.find((h) => h.symbol === symbol)!;
      const remainingShares = current.shares - shares;

      if (remainingShares <= 0) {
        return prev.filter((h) => h.symbol !== symbol);
      } else {
        const equity = +(remainingShares * price).toFixed(2);
        const totalInvested = remainingShares * current.avgCost;
        const totalGain = +(equity - totalInvested).toFixed(2);
        const totalGainPercent = +((totalGain / totalInvested) * 100).toFixed(2);

        return prev.map((h) =>
          h.symbol === symbol
            ? {
                ...h,
                shares: remainingShares,
                currentPrice: price,
                equity,
                totalGain,
                totalGainPercent,
              }
            : h
        );
      }
    });

    // Record in history
    const tradeOrder = await StockApiClient.executeTrade({
      symbol,
      companyName,
      side: 'SELL',
      orderType,
      shares,
      executionPrice: price,
      totalValue: totalProceeds,
      notes: `${orderType} order filled via RIHA Trading Engine`,
    });

    setTradeHistory((prev) => [tradeOrder, ...prev]);

    addToast(
      'info',
      'Order Filled: SELL',
      `Sold ${shares} shares of ${symbol} @ \$${price.toFixed(2)} (Proceeds: \$${totalProceeds.toLocaleString()})`
    );

    closeTradeModal();
    return true;
  };

  // Toggle Personalized Watchlist Stock
  const togglePersonalizedStock = (symbol: string) => {
    setTrendingStocks((prev) => {
      const updated = prev.map((stock) =>
        stock.symbol === symbol ? { ...stock, isPersonalized: !stock.isPersonalized } : stock
      );

      const personalizedSymbols = updated.filter((s) => s.isPersonalized).map((s) => s.symbol);
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(personalizedSymbols));

      const target = updated.find((s) => s.symbol === symbol);
      if (target?.isPersonalized) {
        addToast('success', 'Watchlist Updated', `Added ${symbol} to your Personalized Selection`);
      } else {
        addToast('info', 'Watchlist Updated', `Removed ${symbol} from Personalized Selection`);
      }

      return updated;
    });
  };

  const personalizedWatchlist = trendingStocks.filter((s) => s.isPersonalized);

  return (
    <TradingContext.Provider
      value={{
        holdings,
        tradeHistory,
        trendingStocks,
        personalizedWatchlist,
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
        toasts,
        dismissToast,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
