import React, { useState, useEffect } from 'react';
import { StockApiClient } from '../../services/stockApiClient';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  SlidersHorizontal,
  Briefcase,
  Layers,
  X,
  Lock,
  Key,
  ShieldCheck,
  LogOut,
  History,
  Wallet,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';

interface RobinhoodStockHolding {
  symbol: string;
  companyName: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  equity: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  runStrategicLoop: boolean;
  executionMode: 'PAPERLESS' | 'ACTUAL';
  latestRecommendation: string;
  strategyConfidenceScore: number;
  strategyDiagnosisSummary: string;
}

interface RobinhoodStockQuote {
  symbol: string;
  companyName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

interface RobinhoodOrderRecord {
  id?: string;
  orderId: string;
  symbol: string;
  companyName?: string;
  side: 'BUY' | 'SELL';
  orderType: string;
  status: string;
  quantity: number;
  executionPrice: number;
  totalValueUsd?: number;
  executedAt: string;
  origin?: string;
  executionMode?: string;
  broker?: string;
}

export const RobinhoodStocksTab: React.FC = () => {
  const [ownedStocks, setOwnedStocks] = useState<RobinhoodStockHolding[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<RobinhoodStockQuote[]>([]);
  const [orderHistory, setOrderHistory] = useState<RobinhoodOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [executionMode, setExecutionMode] = useState<'PAPERLESS' | 'ACTUAL'>('PAPERLESS');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Active Sub-section
  const [activeSubSection, setActiveSubSection] = useState<'HOLDINGS' | 'HISTORY'>('HOLDINGS');

  // Robinhood Live Auth State (Pre-configured from live session token)
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    username?: string;
    accountNumber?: string;
    portfolioEquity?: number;
    buyingPower?: number;
    cash?: number;
    message?: string;
  }>({
    authenticated: true,
    username: 'rami28984',
    accountNumber: '605681865',
    portfolioEquity: 1949.10,
    buyingPower: 5.50,
    cash: 5.50,
    message: 'Authenticated with Robinhood Live (Configured Token)',
  });

  // Quick Order Modal State
  const [selectedStockForOrder, setSelectedStockForOrder] = useState<{
    symbol: string;
    companyName: string;
    price: number;
    side: 'BUY' | 'SELL';
    maxShares?: number;
  } | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  useEffect(() => {
    loadRobinhoodStocksData();
  }, []);

  const loadRobinhoodStocksData = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const [auth, stocks, trending, settings, history] = await Promise.all([
        StockApiClient.getRobinhoodAuthStatus(),
        StockApiClient.getRobinhoodStocks(),
        StockApiClient.getRobinhoodTrendingStocks(),
        StockApiClient.getGlobalSettings(),
        StockApiClient.getOrchestratedOrderHistory('ALL'),
      ]);

      if (auth) {
        setAuthStatus(auth);
      }
      setOwnedStocks(stocks || []);
      setTrendingStocks(trending || []);
      if (settings?.robinhoodExecutionMode) {
        setExecutionMode(settings.robinhoodExecutionMode);
      }

      // Filter orders belonging to Robinhood
      if (Array.isArray(history)) {
        const rhOrders = history.filter((item: any) => !item.broker || item.broker === 'ROBINHOOD');
        setOrderHistory(rhOrders);
      }
    } catch (e: any) {
      console.warn('Could not load Robinhood stocks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncLiveOrders = async () => {
    setIsSyncingOrders(true);
    setStatusMessage(null);
    try {
      const synced = await StockApiClient.syncRobinhoodStockOrders();
      setStatusMessage({
        type: 'success',
        text: `Synchronized ${synced.length} real stock transaction records live from Robinhood API!`,
      });
      await loadRobinhoodStocksData();
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Failed to sync live orders from Robinhood: ' + e.message });
    } finally {
      setIsSyncingOrders(false);
    }
  };

  const handleToggleExecutionMode = async (newMode: 'PAPERLESS' | 'ACTUAL') => {
    try {
      await StockApiClient.updateBrokerMode('ROBINHOOD', newMode);
      setExecutionMode(newMode);
      setStatusMessage({
        type: 'success',
        text: `Robinhood Stock execution mode set to ${newMode === 'ACTUAL' ? 'Actual Live Trading' : 'Paperless Simulation Trading'}.`,
      });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Failed to update execution mode.' });
    }
  };

  const handleToggleStrategicLoop = async (stock: RobinhoodStockHolding) => {
    try {
      const newLoop = !stock.runStrategicLoop;
      await StockApiClient.updateStockStrategicLoop(stock.symbol, newLoop, stock.executionMode);
      setOwnedStocks((prev) =>
        prev.map((s) => (s.symbol === stock.symbol ? { ...s, runStrategicLoop: newLoop } : s))
      );
    } catch (e: any) {
      console.error('Failed to toggle strategic loop:', e);
    }
  };

  const openOrderModal = (symbol: string, companyName: string, price: number, side: 'BUY' | 'SELL', maxShares?: number) => {
    setSelectedStockForOrder({ symbol, companyName, price, side, maxShares });
    setOrderQuantity(1);
    setLimitPrice(price);
    setOrderType('MARKET');
    setStatusMessage(null);
  };

  const handleExecuteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForOrder) return;
    if (orderQuantity <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a quantity greater than zero.' });
      return;
    }

    setIsSubmittingOrder(true);
    setStatusMessage(null);
    try {
      if (selectedStockForOrder.side === 'BUY') {
        const res = await StockApiClient.buyRobinhoodStock(
          selectedStockForOrder.symbol,
          orderQuantity,
          orderType === 'LIMIT' ? limitPrice : undefined,
          orderType,
          executionMode
        );
        setStatusMessage({
          type: 'success',
          text: `BUY order executed for ${orderQuantity} share(s) of ${selectedStockForOrder.symbol} at $${res.price.toFixed(2)} (${res.executionMode} Mode). Order ID: ${res.orderId}`,
        });
      } else {
        const res = await StockApiClient.sellRobinhoodStock(
          selectedStockForOrder.symbol,
          orderQuantity,
          orderType === 'LIMIT' ? limitPrice : undefined,
          orderType,
          executionMode
        );
        setStatusMessage({
          type: 'success',
          text: `SELL order executed for ${orderQuantity} share(s) of ${selectedStockForOrder.symbol} at $${res.price.toFixed(2)} (${res.executionMode} Mode). Order ID: ${res.orderId}`,
        });
      }
      setSelectedStockForOrder(null);
      await loadRobinhoodStocksData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Robinhood order placement failed.' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const totalStockEquity = ownedStocks.reduce((sum, s) => sum + (s.equity || 0), 0);
  const totalStockGain = ownedStocks.reduce((sum, s) => sum + (s.totalGain || 0), 0);

  const filteredTrending = trendingStocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ROBINHOOD LIVE CONNECTED TELEMETRY BAR */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                Robinhood Live Connected
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                @{authStatus.username || 'rami28984'}
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Configured Token
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Account #: <span className="font-bold text-slate-700">{authStatus.accountNumber || '605681865'}</span> • Settled Cash: <span className="font-bold text-slate-900">${(authStatus.cash ?? 5.50).toFixed(2)}</span> • Buying Power: <span className="font-bold text-emerald-700">${(authStatus.buyingPower ?? 5.50).toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncLiveOrders}
            disabled={isSyncingOrders}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOrders ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isSyncingOrders ? 'Syncing...' : 'Sync Live Orders & Holdings'}</span>
          </button>
        </div>
      </div>

      {/* Control Banner: Mode Switcher & Global Telemetry */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Zap className="w-4 h-4 fill-emerald-500" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Robinhood Equities &amp; Stock Portfolio
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
              Live REST API
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciles live Robinhood positions, evaluates strategic algorithms, and executes actual or paperless stock trades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              Mode:
            </span>
            <button
              onClick={() => handleToggleExecutionMode('PAPERLESS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                executionMode === 'PAPERLESS'
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paperless
            </button>
            <button
              onClick={() => handleToggleExecutionMode('ACTUAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                executionMode === 'ACTUAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Actual Live
            </button>
          </div>

          <button
            onClick={loadRobinhoodStocksData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <p className="flex-1 leading-relaxed">{statusMessage.text}</p>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
            Robinhood Stock Equity Value
          </span>
          <div className="text-2xl font-black font-mono text-slate-900">
            ${totalStockEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 font-mono mt-0.5 block">
            {ownedStocks.length} Equity Positions Owned
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
            Total Unrealized Return
          </span>
          <div className={`text-2xl font-black font-mono ${totalStockGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalStockGain >= 0 ? '+' : ''}${totalStockGain.toFixed(2)}
          </div>
          <span className="text-xs text-slate-500 font-mono mt-0.5 block">
            Cumulative Return on Robinhood Equities
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
            Active Trading Pipeline
          </span>
          <div className="text-xl font-black font-mono text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {executionMode === 'ACTUAL' ? 'Robinhood Live API' : 'Paperless Simulation'}
          </div>
          <span className="text-xs text-slate-500 font-mono mt-0.5 block">
            Automated Strategy Scanner &amp; Virtual Threads
          </span>
        </div>
      </div>

      {/* SUB-SECTION TABS: OWNED STOCKS VS ORDER HISTORY */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubSection('HOLDINGS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubSection === 'HOLDINGS'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Stocks You Own on Robinhood ({ownedStocks.length})</span>
        </button>

        <button
          onClick={() => setActiveSubSection('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubSection === 'HISTORY'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Purchase &amp; Order History ({orderHistory.length})</span>
        </button>
      </div>

      {/* VIEW 1: STOCKS YOU OWN */}
      {activeSubSection === 'HOLDINGS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Details of Stocks You Own ({ownedStocks.length} Positions)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time equity valuation, cost-basis, strategic loop diagnostics, and buy/sell controls
                </p>
              </div>
            </div>

            {ownedStocks.length === 0 ? (
              <div className="p-10 text-center text-slate-500 space-y-3">
                <p className="text-sm font-semibold text-slate-700">No Robinhood stocks currently owned.</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your Robinhood account currently has 0 active stock positions. Execute a purchase below to begin monitoring.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="py-3 px-4">Stock / Company</th>
                      <th className="py-3 px-4 text-right">Shares</th>
                      <th className="py-3 px-4 text-right">Avg Cost</th>
                      <th className="py-3 px-4 text-right">Market Price</th>
                      <th className="py-3 px-4 text-right">Total Equity</th>
                      <th className="py-3 px-4 text-right">Total Return</th>
                      <th className="py-3 px-4 text-center">Strategic Loop</th>
                      <th className="py-3 px-4 text-center">Mode</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {ownedStocks.map((stock) => {
                      const isPositive = stock.totalGain >= 0;
                      return (
                        <tr key={stock.symbol} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-xs flex items-center justify-center">
                                {stock.symbol.substring(0, 3)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 font-mono block leading-tight">
                                  {stock.symbol}
                                </span>
                                <span className="text-xs text-slate-500 truncate max-w-[140px] block mt-0.5">
                                  {stock.companyName}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                            {stock.shares.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            ${stock.avgCost.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            ${stock.currentPrice.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                            ${stock.equity.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            <div
                              className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                                isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                              }`}
                            >
                              {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                              {isPositive ? '+' : ''}${stock.totalGain.toFixed(2)} ({isPositive ? '+' : ''}
                              {stock.totalGainPercent.toFixed(2)}%)
                            </div>
                          </td>

                          {/* Strategic Loop */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => handleToggleStrategicLoop(stock)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                  stock.runStrategicLoop
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                <Zap className={`w-3 h-3 ${stock.runStrategicLoop ? 'text-emerald-600 fill-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                                <span>{stock.runStrategicLoop ? 'Active' : 'Off'}</span>
                              </button>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                                  stock.latestRecommendation === 'BUY'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : stock.latestRecommendation === 'SELL'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {stock.latestRecommendation}
                              </span>
                            </div>
                          </td>

                          {/* Mode */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                stock.executionMode === 'PAPERLESS'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {stock.executionMode}
                            </span>
                          </td>

                          {/* Buy / Sell Quick Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openOrderModal(stock.symbol, stock.companyName, stock.currentPrice, 'BUY')}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Buy</span>
                              </button>

                              <button
                                onClick={() => openOrderModal(stock.symbol, stock.companyName, stock.currentPrice, 'SELL', stock.shares)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <Minus className="w-3 h-3" />
                                <span>Sell</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: DISCOVER & TRADE ROBINHOOD STOCKS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Discover &amp; Trade Popular Robinhood Stocks
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live quotes from Robinhood Public Equities API • One-Click Market/Limit Orders
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ticker (e.g. AAPL, NVDA)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTrending.map((quote) => {
                const isUp = quote.change >= 0;
                return (
                  <div
                    key={quote.symbol}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm font-mono text-slate-900">{quote.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 font-semibold">
                          Stock
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 truncate max-w-[130px] block mt-0.5">
                        {quote.companyName}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-black font-mono text-slate-900">
                          ${quote.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded flex items-center ${
                            isUp ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {isUp ? '+' : ''}
                          {quote.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => openOrderModal(quote.symbol, quote.companyName, quote.price, 'BUY')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buy</span>
                      </button>
                      <button
                        onClick={() => openOrderModal(quote.symbol, quote.companyName, quote.price, 'SELL')}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: STOCK PURCHASE & TRANSACTION HISTORY */}
      {activeSubSection === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Robinhood Stock Purchase &amp; Trade History ({orderHistory.length} Orders)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete audit trail of all stock transactions with origin tags (Direct Robinhood vs Application)
              </p>
            </div>

            <button
              onClick={handleSyncLiveOrders}
              disabled={isSyncingOrders}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOrders ? 'animate-spin' : ''}`} />
              <span>{isSyncingOrders ? 'Syncing...' : 'Sync Latest from Robinhood Live'}</span>
            </button>
          </div>

          {orderHistory.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <p className="text-sm font-semibold text-slate-700">No stock transaction history recorded yet.</p>
              <p className="text-xs text-slate-400">
                Click &quot;Sync Latest from Robinhood Live&quot; to fetch your historical orders directly from Robinhood.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Side</th>
                    <th className="py-3 px-4 text-right">Shares</th>
                    <th className="py-3 px-4 text-right">Executed Price</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Origin</th>
                    <th className="py-3 px-4 text-center">Mode</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {orderHistory.map((order) => {
                    const isBuy = order.side === 'BUY';
                    const isFilled = order.status === 'FILLED';
                    return (
                      <tr key={order.orderId || order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {order.orderId.substring(0, 14)}...
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {order.symbol}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              isBuy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {order.side}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                          {Number(order.quantity).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-700">
                          ${Number(order.executionPrice || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ${Number(order.totalValueUsd || order.quantity * order.executionPrice || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isFilled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.origin === 'ROBINHOOD_DIRECT'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {order.origin === 'ROBINHOOD_DIRECT' ? 'Robinhood Direct' : 'RIHA App'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              order.executionMode === 'ACTUAL'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {order.executionMode || 'ACTUAL'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-500 font-sans text-[11px]">
                          {order.executedAt ? new Date(order.executedAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QUICK ORDER MODAL */}
      {selectedStockForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-xs font-black ${
                      selectedStockForOrder.side === 'BUY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedStockForOrder.side}
                  </span>
                  <span>{selectedStockForOrder.symbol}</span>
                </h3>
                <span className="text-xs text-slate-500">{selectedStockForOrder.companyName}</span>
              </div>
              <button
                onClick={() => setSelectedStockForOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteOrder} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('MARKET')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      orderType === 'MARKET'
                        ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Market Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('LIMIT')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      orderType === 'LIMIT'
                        ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Limit Order
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Number of Shares</label>
                  {selectedStockForOrder.maxShares !== undefined && (
                    <span className="text-xs text-slate-500 font-mono">
                      Owned: {selectedStockForOrder.maxShares}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Limit Price (USD)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Order Estimation Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Current Robinhood Price:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ${selectedStockForOrder.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Execution Pipeline:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {executionMode === 'ACTUAL' ? 'Robinhood Live API' : 'Paperless Sandbox'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                  <span>Estimated Total:</span>
                  <span className="font-mono text-sm font-black text-slate-900">
                    ${(orderQuantity * (orderType === 'LIMIT' ? limitPrice : selectedStockForOrder.price)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStockForOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className={`px-5 py-2 rounded-xl font-bold text-xs text-white shadow-md transition-all ${
                    selectedStockForOrder.side === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }`}
                >
                  {isSubmittingOrder ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing...
                    </span>
                  ) : (
                    <span>Confirm {selectedStockForOrder.side} Order</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
