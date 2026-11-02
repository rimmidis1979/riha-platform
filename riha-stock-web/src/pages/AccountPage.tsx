import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrading } from '../context/TradingContext';
import { PerformanceChart } from '../components/trading/PerformanceChart';
import { HoldingsTable } from '../components/trading/HoldingsTable';
import { TradeHistoryTable } from '../components/trading/TradeHistoryTable';
import { RobinhoodMcpIntegrationCard } from '../components/account/RobinhoodMcpIntegrationCard';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Briefcase,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
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
    <div className="space-y-6">
      {/* Account Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Personalized Portfolio Dashboard
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              {user?.tier || 'Professional Tier'}
            </span>
            {user?.robinhoodConnected ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Robinhood MCP Linked
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                Robinhood MCP Unlinked
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            {user?.name || 'Trader'}'s Account
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Account: <strong className="text-slate-800">{user?.accountNumber || 'RH-001'}</strong> • Settlement: T+0 Real-Time
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Robinhood MCP Gateway Integration Card (User-Level API Key) */}
      <RobinhoodMcpIntegrationCard />

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Portfolio Value */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Portfolio Value</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            ${portfolioSummary.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Equity: ${portfolioSummary.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 2. Available Cash */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Cash</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            ${portfolioSummary.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Settled Cash Balance
          </div>
        </div>

        {/* 3. Today's Return */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Return</span>
            <div className={`p-2 rounded-xl ${isTodayGainPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${isTodayGainPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isTodayGainPositive ? '+' : ''}${Math.abs(portfolioSummary.todayGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center text-xs font-mono font-bold mt-1">
            <span className={isTodayGainPositive ? 'text-emerald-700' : 'text-rose-700'}>
              {isTodayGainPositive ? '+' : ''}{portfolioSummary.todayGainPercent.toFixed(2)}% Today
            </span>
          </div>
        </div>

        {/* 4. Total All-Time Return */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total All-Time Return</span>
            <div className={`p-2 rounded-xl ${isTotalGainPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isTotalGainPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${isTotalGainPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isTotalGainPositive ? '+' : ''}${Math.abs(portfolioSummary.allTimeGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center text-xs font-mono font-bold mt-1">
            <span className={isTotalGainPositive ? 'text-emerald-700' : 'text-rose-700'}>
              {isTotalGainPositive ? '+' : ''}{portfolioSummary.allTimeGainPercent.toFixed(2)}% Cumulative
            </span>
          </div>
        </div>
      </div>

      {/* Performance Curve Chart (Day, Week, Month, Year, All) */}
      <PerformanceChart />

      {/* Holdings & Order History Navigation */}
      <div className="space-y-4">
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
                {holdings.length}
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

        {/* Content View */}
        {activeSubTab === 'holdings' ? (
          <HoldingsTable onExploreTrending={onExploreTrending} />
        ) : (
          <TradeHistoryTable />
        )}
      </div>
    </div>
  );
};
