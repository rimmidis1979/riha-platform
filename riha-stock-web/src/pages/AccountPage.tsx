import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { StockApiClient } from '../services/stockApiClient';
import { PerformanceChart } from '../components/trading/PerformanceChart';
import { HoldingsTable } from '../components/trading/HoldingsTable';
import { TradeHistoryTable } from '../components/trading/TradeHistoryTable';
import { RobinhoodMcpIntegrationCard } from '../components/account/RobinhoodMcpIntegrationCard';
import { SchwabIntegrationCard } from '../components/account/SchwabIntegrationCard';
import { RobinhoodStocksTab } from '../components/account/RobinhoodStocksTab';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Briefcase,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Landmark,
  Zap,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Holding } from '../types/trading';

interface AccountPageProps {
  onExploreTrending: () => void;
  onNavigateToStrategies?: (ticker: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onExploreTrending, onNavigateToStrategies }) => {
  const { user, updateCashBalance } = useAuth();
  const {
    holdings,
    setHoldings,
    openTradeModal,
    trendingStocks,
    selectedProvider,
    setSelectedProvider,
  } = useTrading();

  // Top Broker Provider is driven by global context dropdown
  const selectedBrokerTab = selectedProvider;
  const setSelectedBrokerTab = setSelectedProvider;
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'history'>('holdings');

  // Broker Telemetry State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [schwabData, setSchwabData] = useState<any>(null);
  const [robinhoodData, setRobinhoodData] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    syncAllBrokers();
  }, []);

  const syncAllBrokers = async () => {
    setIsSyncing(true);
    try {
      const [consolidated, settings] = await Promise.all([
        StockApiClient.getConsolidatedPortfolio(),
        StockApiClient.getGlobalSettings(),
      ]);

      if (settings) {
        setGlobalSettings(settings);
      }

      if (consolidated) {
        setRobinhoodData(consolidated.robinhood || null);
        setSchwabData(consolidated.charlesSchwab || null);

        // Merge holdings from Robinhood and Schwab into unified ledger
        const mergedHoldings: Holding[] = [];

        // 1. Process Robinhood holdings
        if (consolidated.robinhood?.positions && Array.isArray(consolidated.robinhood.positions)) {
          for (const p of consolidated.robinhood.positions) {
            const sym = p.symbol || 'UNKNOWN';
            const qty = Number(p.quantity || 0);
            const avgCost = Number(p.averageCost || p.currentPrice || 0);
            const curPrice = Number(p.currentPrice || avgCost || 0);
            const eq = Number(p.marketValue || qty * curPrice || 0);
            const unPnl = Number(p.unrealizedPnl || 0);
            const unPnlPct = Number(p.unrealizedPnlPct || 0);

            mergedHoldings.push({
              symbol: sym,
              name: `${sym} (Robinhood Crypto/Stock)`,
              shares: qty,
              avgCost,
              currentPrice: curPrice,
              equity: eq,
              totalGain: unPnl,
              totalGainPercent: unPnlPct,
              dayGain: unPnl,
              dayGainPercent: unPnlPct,
              allocationPercent: 50,
              broker: 'ROBINHOOD',
              runStrategicLoop: true,
              executionMode: settings?.robinhoodExecutionMode || 'ACTUAL',
              latestRecommendation: 'HOLD',
            });
          }
        }

        // 2. Process Schwab holdings
        if (consolidated.charlesSchwab?.positions && Array.isArray(consolidated.charlesSchwab.positions)) {
          for (const p of consolidated.charlesSchwab.positions) {
            const sym = p.symbol || 'UNKNOWN';
            const qty = Number(p.quantity || 0);
            const avgCost = Number(p.averageCost || p.currentPrice || 0);
            const curPrice = Number(p.currentPrice || avgCost || 0);
            const eq = Number(p.marketValue || qty * curPrice || 0);
            const unPnl = Number(p.unrealizedPnl || 0);
            const unPnlPct = Number(p.unrealizedPnlPct || 0);

            mergedHoldings.push({
              symbol: sym,
              name: `${sym} (Charles Schwab)`,
              shares: qty,
              avgCost,
              currentPrice: curPrice,
              equity: eq,
              totalGain: unPnl,
              totalGainPercent: unPnlPct,
              dayGain: unPnl,
              dayGainPercent: unPnlPct,
              allocationPercent: 50,
              broker: 'CHARLES_SCHWAB',
              runStrategicLoop: true,
              executionMode: settings?.schwabExecutionMode || 'PAPERLESS',
              latestRecommendation: 'HOLD',
            });
          }
        }

        if (mergedHoldings.length > 0) {
          setHoldings(mergedHoldings);
        }

        // Update local cash balance in AuthContext
        const totalLiveCash = Number(consolidated.totalSettledCash || 0);
        if (totalLiveCash > 0) {
          updateCashBalance(totalLiveCash);
        }
      }
    } catch (e) {
      console.error('Failed to sync all broker portfolios:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract financial KPIs
  const rbEquity = Number(robinhoodData?.totalEquity || 0);
  const rbCash = Number(robinhoodData?.cashBalance || robinhoodData?.settledCash || 0);
  const rbBuyingPower = Number(robinhoodData?.buyingPower || 0);

  const schwabEquity = Number(schwabData?.liquidationValue || schwabData?.totalEquity || 0);
  const schwabCash = Number(schwabData?.cashBalance || schwabData?.settledCash || 0);
  const schwabBuyingPower = Number(schwabData?.buyingPower || 0);

  const totalCombinedEquity = rbEquity + schwabEquity;
  const totalCash = rbCash + schwabCash;
  const totalBuyingPower = rbBuyingPower + schwabBuyingPower;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Multi-Broker Executive Ledger</span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/80">
                  Dual Pipeline
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Robinhood Crypto &amp; Equities • Charles Schwab Trader API • Real-Time Strategic Loop Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={syncAllBrokers}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Brokers'}</span>
          </button>

          <button
            onClick={() => {
              if (trendingStocks.length > 0) {
                const stockToBuy = trendingStocks[0];
                openTradeModal({
                  symbol: stockToBuy.symbol,
                  companyName: stockToBuy.companyName,
                  currentPrice: stockToBuy.price,
                  defaultSide: 'BUY',
                });
              } else {
                onExploreTrending();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Trade Order</span>
          </button>
        </div>
      </div>

      {/* Primary Broker Navigation Tabs */}
      <div className="bg-[#0c1220] p-1.5 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-800">
        <button
          onClick={() => setSelectedBrokerTab('CONSOLIDATED')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'CONSOLIDATED'
              ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Consolidated Portfolio</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {holdings.length} Assets
          </span>
        </button>

        <button
          onClick={() => setSelectedBrokerTab('ROBINHOOD_STOCKS')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'ROBINHOOD_STOCKS'
              ? 'bg-emerald-950/70 text-emerald-300 shadow-sm border border-emerald-800/80'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Robinhood Stocks</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            Equities &amp; Trade
          </span>
        </button>

        <button
          onClick={() => setSelectedBrokerTab('ROBINHOOD_CRYPTO')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'ROBINHOOD_CRYPTO'
              ? 'bg-emerald-950/70 text-emerald-300 shadow-sm border border-emerald-800/80'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-400 fill-emerald-500" />
          <span>Robinhood Crypto (MCP)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            ${(rbEquity + rbCash).toFixed(2)}
          </span>
        </button>

        <button
          onClick={() => setSelectedBrokerTab('CHARLES_SCHWAB')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'CHARLES_SCHWAB'
              ? 'bg-sky-950/70 text-sky-300 shadow-sm border border-sky-800/80'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Landmark className="w-4 h-4 text-sky-400" />
          <span>Charles Schwab</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 font-mono">
            ${(schwabEquity + schwabCash).toFixed(2)}
          </span>
        </button>
      </div>

      {/* TAB 1: CONSOLIDATED PORTFOLIO VIEW */}
      {selectedBrokerTab === 'CONSOLIDATED' && (
        <div className="space-y-6">
          {/* 4 Consolidated Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Consolidated Portfolio</span>
                <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ${(totalCombinedEquity + totalCash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Robinhood + Schwab Total Asset Value
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Combined Available Cash</span>
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                RH: ${rbCash.toFixed(2)} • Schwab: ${schwabCash.toFixed(2)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Buying Power</span>
                <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                ${totalBuyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Available for Multi-Broker Auto-Trading
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Broker Feeds</span>
                <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                2 Connected
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Robinhood Live + Schwab OAuth
              </div>
            </div>
          </div>

          {/* Performance Curve Chart */}
          <PerformanceChart />
        </div>
      )}

      {/* TAB 2: ROBINHOOD STOCKS (EQUITIES) VIEW */}
      {selectedBrokerTab === 'ROBINHOOD_STOCKS' && (
        <div className="space-y-6">
          <RobinhoodStocksTab onNavigateToStrategies={onNavigateToStrategies} />
        </div>
      )}

      {/* TAB 3: ROBINHOOD CRYPTO (MCP) VIEW */}
      {selectedBrokerTab === 'ROBINHOOD_CRYPTO' && (
        <div className="space-y-6">
          {/* Robinhood MCP Card */}
          <RobinhoodMcpIntegrationCard />

          {/* 4 Robinhood Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Robinhood Total Value</span>
                <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ${(rbEquity + rbCash).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">Live Robinhood MCP Telemetry</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Settled Cash</span>
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ${rbCash.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">T+0 Settled Balance</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Crypto Buying Power</span>
                <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                ${rbBuyingPower.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">Live Instant Buying Power</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Robinhood Account #</span>
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {robinhoodData?.accountNumber || 'NOT CONNECTED'}
              </div>
              <div className="text-xs text-emerald-400 font-semibold mt-1">
                {robinhoodData?.accountNumber ? 'Authenticated via Live Session Token' : 'Authentication Pending'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHARLES SCHWAB SPECIFIC VIEW */}
      {selectedBrokerTab === 'CHARLES_SCHWAB' && (
        <div className="space-y-6">
          {/* Charles Schwab Integration Card */}
          <SchwabIntegrationCard onPortfolioSynced={syncAllBrokers} />

          {/* 4 Schwab Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Schwab Liquidation Value</span>
                <div className="p-2 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/60">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ${(schwabEquity + schwabCash).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">Total Equity + Balances</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Available Cash</span>
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ${schwabCash.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">Settled Cash in Schwab</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Margin Buying Power</span>
                <div className="p-2 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/60">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-sky-400">
                ${schwabBuyingPower.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">Charles Schwab Trader API</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Connection State</span>
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-black font-mono text-white">
                {schwabData?.connected ? 'CONNECTED' : 'OAUTH PENDING'}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">Callback: /schwab/callback</div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings & Order History Navigation (for Consolidated, Crypto & Schwab) */}
      {selectedBrokerTab !== 'ROBINHOOD_STOCKS' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubTab('holdings')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
                  activeSubTab === 'holdings'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Details of Stocks You Own</span>
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono">
                  {selectedBrokerTab === 'CONSOLIDATED'
                    ? holdings.length
                    : selectedBrokerTab === 'ROBINHOOD_CRYPTO'
                    ? holdings.filter((h) => !h.broker || h.broker === 'ROBINHOOD').length
                    : holdings.filter((h) => h.broker === 'CHARLES_SCHWAB').length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('history')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
                  activeSubTab === 'history'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Stock Purchase &amp; Trade History</span>
              </button>
            </div>
          </div>

          {/* Content View with Broker Filtering */}
          {activeSubTab === 'holdings' ? (
            <HoldingsTable
              onExploreTrending={onExploreTrending}
              onNavigateToStrategies={onNavigateToStrategies}
              brokerFilter={
                selectedBrokerTab === 'ROBINHOOD_CRYPTO'
                  ? 'ROBINHOOD'
                  : selectedBrokerTab === 'CHARLES_SCHWAB'
                  ? 'CHARLES_SCHWAB'
                  : 'ALL'
              }
            />
          ) : (
            <TradeHistoryTable
              brokerFilter={
                selectedBrokerTab === 'ROBINHOOD_CRYPTO'
                  ? 'ROBINHOOD'
                  : selectedBrokerTab === 'CHARLES_SCHWAB'
                  ? 'CHARLES_SCHWAB'
                  : 'ALL'
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
