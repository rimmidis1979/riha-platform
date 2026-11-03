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
}

export const AccountPage: React.FC<AccountPageProps> = ({ onExploreTrending }) => {
  const { user, updateCashBalance } = useAuth();
  const { holdings, setHoldings, openTradeModal, trendingStocks } = useTrading();

  // Top Broker Tab State: CONSOLIDATED vs ROBINHOOD_STOCKS vs ROBINHOOD_CRYPTO vs CHARLES_SCHWAB
  const [selectedBrokerTab, setSelectedBrokerTab] = useState<'CONSOLIDATED' | 'ROBINHOOD_STOCKS' | 'ROBINHOOD_CRYPTO' | 'CHARLES_SCHWAB'>('CONSOLIDATED');
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

        // 2. Process Charles Schwab holdings
        if (consolidated.charlesSchwab?.positions && Array.isArray(consolidated.charlesSchwab.positions)) {
          for (const sp of consolidated.charlesSchwab.positions) {
            const sym = sp.symbol || 'UNKNOWN';
            const qty = Number(sp.quantity || 0);
            const avgCost = Number(sp.averageCost || sp.currentPrice || 0);
            const curPrice = Number(sp.currentPrice || avgCost || 0);
            const eq = Number(sp.marketValue || qty * curPrice || 0);
            const unPnl = Number(sp.unrealizedPnl || 0);
            const unPnlPct = Number(sp.unrealizedPnlPct || 0);

            mergedHoldings.push({
              symbol: sym,
              name: sp.companyName || `${sym} (Charles Schwab)`,
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

        if (typeof consolidated.totalCashBalance === 'number' && user?.cashBalance !== undefined) {
          updateCashBalance(consolidated.totalCashBalance - user.cashBalance);
        }
      }
    } catch (e) {
      console.warn('Could not sync consolidated broker telemetry:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Compute stats dynamically per tab
  const totalCombinedEquity = holdings.reduce((sum, h) => sum + (h.equity || 0), 0);
  const rbEquity = holdings.filter((h) => !h.broker || h.broker === 'ROBINHOOD').reduce((sum, h) => sum + (h.equity || 0), 0);
  const schwabEquity = holdings.filter((h) => h.broker === 'CHARLES_SCHWAB').reduce((sum, h) => sum + (h.equity || 0), 0);

  const rbCash = Number(robinhoodData?.cashBalance ?? user?.cashBalance ?? 5.50);
  const schwabCash = Number(schwabData?.cashBalance ?? 0);
  const totalCash = rbCash + schwabCash;

  const rbBuyingPower = Number(robinhoodData?.buyingPower ?? rbCash);
  const schwabBuyingPower = Number(schwabData?.buyingPower ?? schwabCash);
  const totalBuyingPower = rbBuyingPower + schwabBuyingPower;

  return (
    <div className="space-y-6">
      {/* Account Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Multi-Broker Trading Terminal
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              Dual-Broker Architecture
            </span>

            {/* Robinhood status badge */}
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Robinhood MCP Linked
            </span>

            {/* Schwab status badge */}
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                schwabData?.connected
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  schwabData?.connected ? 'bg-sky-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {schwabData?.connected ? 'Charles Schwab Linked' : 'Schwab OAuth Ready'}
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            {user?.name || 'Trader'}'s Brokerage Accounts
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Robinhood Crypto &amp; Equities • Charles Schwab Trader API • Real-Time Strategic Loop Engine
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={syncAllBrokers}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Trade Order</span>
          </button>
        </div>
      </div>

      {/* Primary Broker Navigation Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
        <button
          onClick={() => setSelectedBrokerTab('CONSOLIDATED')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'CONSOLIDATED'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Consolidated Portfolio</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            {holdings.length} Assets
          </span>
        </button>

        <button
          onClick={() => setSelectedBrokerTab('ROBINHOOD_STOCKS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'ROBINHOOD_STOCKS'
              ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Robinhood Stocks</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono">
            Equities &amp; Trade
          </span>
        </button>

        <button
          onClick={() => setSelectedBrokerTab('ROBINHOOD_CRYPTO')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'ROBINHOOD_CRYPTO'
              ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
          <span>Robinhood Crypto (MCP)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono">
            ${(rbEquity + rbCash).toFixed(2)}
          </span>
        </button>

        <button
          onClick={() => setSelectedBrokerTab('CHARLES_SCHWAB')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            selectedBrokerTab === 'CHARLES_SCHWAB'
              ? 'bg-white text-sky-700 shadow-sm border border-sky-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4 text-sky-600" />
          <span>Charles Schwab</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-mono">
            ${(schwabEquity + schwabCash).toFixed(2)}
          </span>
        </button>
      </div>

      {/* TAB 1: CONSOLIDATED PORTFOLIO VIEW */}
      {selectedBrokerTab === 'CONSOLIDATED' && (
        <div className="space-y-6">
          {/* 4 Consolidated Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Consolidated Portfolio</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                ${(totalCombinedEquity + totalCash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                Robinhood + Schwab Total Asset Value
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Combined Available Cash</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                ${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                RH: ${rbCash.toFixed(2)} • Schwab: ${schwabCash.toFixed(2)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Buying Power</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                ${totalBuyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                Available for Multi-Broker Auto-Trading
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Broker Feeds</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                2 Connected
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
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
          <RobinhoodStocksTab />
        </div>
      )}

      {/* TAB 3: ROBINHOOD CRYPTO (MCP) VIEW */}
      {selectedBrokerTab === 'ROBINHOOD_CRYPTO' && (
        <div className="space-y-6">
          {/* Robinhood MCP Card */}
          <RobinhoodMcpIntegrationCard />

          {/* 4 Robinhood Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Robinhood Total Value</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                ${(rbEquity + rbCash).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Live Robinhood MCP Telemetry</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Settled Cash</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                ${rbCash.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">T+0 Settled Balance</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Crypto Buying Power</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Zap className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700">
                ${rbBuyingPower.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Live Instant Buying Power</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Robinhood Account #</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-slate-900">
                {robinhoodData?.accountNumber || 'NOT CONNECTED'}
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {robinhoodData?.accountNumber ? 'Authenticated via Ed25519' : 'Authentication Pending'}
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
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Schwab Liquidation Value</span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                ${(schwabEquity + schwabCash).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Total Equity + Balances</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Available Cash</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                ${schwabCash.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Settled Cash in Schwab</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Margin Buying Power</span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-sky-700">
                ${schwabBuyingPower.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Charles Schwab Trader API</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Connection State</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {schwabData?.connected ? 'CONNECTED' : 'OAUTH PENDING'}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Callback: /schwab/callback</div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings & Order History Navigation (for Consolidated, Crypto & Schwab) */}
      {selectedBrokerTab !== 'ROBINHOOD_STOCKS' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubTab('holdings')}
                className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
                  activeSubTab === 'holdings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Details of Stocks You Own</span>
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
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
