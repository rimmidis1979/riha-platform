import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { PerformanceChart } from '../components/trading/PerformanceChart';
import { HoldingsTable } from '../components/trading/HoldingsTable';
import { TradeHistoryTable } from '../components/trading/TradeHistoryTable';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface AccountPageProps {
  onExploreTrending: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onExploreTrending }) => {
  const { user } = useAuth();
  const { portfolioSummary, holdings, openTradeModal, trendingStocks } = useTrading();
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'history'>('holdings');

  const isTodayGainPositive = portfolioSummary.todayGain >= 0;
  const isTotalGainPositive = portfolioSummary.allTimeGain >= 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Account Hero Bar & Metric Cards */}
      <div className="space-y-4">
        {/* User Account Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl onyx-card border border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Personalized Portfolio Dashboard
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                {user?.tier || 'Professional Tier'}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              {user?.name}'s Trading Account
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Account No: <strong className="text-zinc-200">{user?.accountNumber || 'RH-7749-01'}</strong> • Margin Rate: 2.0x • Settlement: T+0 Real-Time
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const stockToBuy = trendingStocks[0] || { symbol: 'NVDA', companyName: 'NVIDIA Corporation', price: 139.80 };
                openTradeModal({
                  symbol: stockToBuy.symbol,
                  companyName: stockToBuy.companyName,
                  currentPrice: stockToBuy.price,
                  defaultSide: 'BUY',
                });
              }}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              New Stock Trade
            </button>

            <button
              onClick={onExploreTrending}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-xs font-mono flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4 text-sky-400 fill-current" />
              Scan Trending
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Portfolio Value */}
          <div className="onyx-card rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="uppercase">Total Portfolio Value</span>
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white mt-2">
              ${portfolioSummary.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              Equity + Cash Total Balance
            </div>
          </div>

          {/* 2. Today's Return */}
          <div className="onyx-card rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="uppercase">Today's Performance</span>
              <div className={`p-1.5 rounded-lg ${isTodayGainPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {isTodayGainPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
            </div>
            <div className={`text-2xl font-black font-mono mt-2 ${isTodayGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isTodayGainPositive ? '+' : ''}${portfolioSummary.todayGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[11px] font-mono font-semibold mt-1 ${isTodayGainPositive ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
              {isTodayGainPositive ? '+' : ''}{portfolioSummary.todayGainPercent.toFixed(2)}% Intraday
            </div>
          </div>

          {/* 3. Cash & Buying Power */}
          <div className="onyx-card rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="uppercase">Available Cash</span>
              <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white mt-2">
              ${portfolioSummary.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              Buying Power: <strong className="text-zinc-200">${(portfolioSummary.cashBalance * 2).toLocaleString()}</strong>
            </div>
          </div>

          {/* 4. All-Time Cumulative Gain */}
          <div className="onyx-card rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="uppercase">All-Time Cumulative Gain</span>
              <div className="p-1.5 rounded-lg bg-zinc-800 text-teal-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black font-mono mt-2 ${isTotalGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isTotalGainPositive ? '+' : ''}${portfolioSummary.allTimeGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-1">
              +{portfolioSummary.allTimeGainPercent.toFixed(1)}% Return on Capital
            </div>
          </div>
        </div>
      </div>

      {/* Overall Performance Chart (Day / Month / Year Selections) */}
      <section className="space-y-3">
        <PerformanceChart />
      </section>

      {/* Account Details Tabs: Stocks You Own vs Trade History */}
      <section className="space-y-4">
        {/* Sub-tabs header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTab('holdings')}
              className={`pb-2 text-sm font-bold font-mono transition-all border-b-2 flex items-center gap-2 ${
                activeSubTab === 'holdings'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>Owned Stocks & Performance</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {holdings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('history')}
              className={`pb-2 text-sm font-bold font-mono transition-all border-b-2 flex items-center gap-2 ${
                activeSubTab === 'history'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>Stock Purchase History</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                Ledger
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeSubTab === 'holdings' ? <HoldingsTable /> : <TradeHistoryTable />}
      </section>
    </div>
  );
};
