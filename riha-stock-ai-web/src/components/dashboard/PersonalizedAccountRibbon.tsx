import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Percent,
  PieChart,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PersonalizedAccountSummary } from '../../types/stockAi';
import { updateAutoTradeMode } from '../../api/stockAiClient';

interface Props {
  summary: PersonalizedAccountSummary | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const PersonalizedAccountRibbon: React.FC<Props> = ({ summary, loading, onRefresh }) => {
  const [togglingMode, setTogglingMode] = useState(false);

  const netEquity = summary?.netAccountEquityUsd ?? 0.0;
  const settledCash = summary?.settledCashUsd ?? 0.0;
  const buyingPower = summary?.liveBuyingPowerUsd ?? 0.0;
  const unrealizedPnl = summary?.unrealizedOpenPnlUsd ?? 0.0;
  const unrealizedPct = summary?.unrealizedOpenPnlPct ?? 0.0;
  const todayProfit = summary?.todayTotalProfitUsd ?? 0.0;
  const todayProfitPct = summary?.todayTotalProfitPct ?? 0.0;
  const allTimeProfit = summary?.overallCumulativeProfitUsd ?? 0.0;
  const activePositions = summary?.activePositionsCount ?? 0;
  const capitalDeployed = summary?.capitalDeployedPct ?? 0.0;
  const winRate = summary?.winRatePct ?? 0.0;
  const profitFactor = summary?.profitFactor ?? 0.0;
  const drawdownPct = summary?.currentDailyDrawdownPct ?? 0.0;
  const maxDrawdownPct = summary?.maxDailyDrawdownLimitPct ?? 3.0;
  const autoProtection = summary?.autonomousProtectionEnabled ?? false;
  const brokerageConnected = summary?.brokerageConnected ?? false;

  const handleToggleAutoProtection = async () => {
    setTogglingMode(true);
    try {
      await updateAutoTradeMode(!autoProtection);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Failed to toggle autonomous mode: ${err.message}`);
    } finally {
      setTogglingMode(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: Net Account Equity & Buying Power */}
      <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition shadow-lg">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Net Account Equity
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300">
              {summary?.accountType || 'CASH'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
            ${netEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Settled Cash</span>
            <span className="text-zinc-200 tabular-nums">
              ${settledCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase block">Available Buying Power</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: Total Portfolio Profit & Gain */}
      <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition shadow-lg">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Unrealized Open P&amp;L
            </span>
            <span
              className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {unrealizedPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {unrealizedPnl >= 0 ? '+' : ''}
              {unrealizedPct.toFixed(2)}%
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
              unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Today Realized</span>
            <span className={`tabular-nums font-semibold ${todayProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {todayProfit >= 0 ? '+' : ''}${todayProfit.toFixed(2)} ({todayProfitPct.toFixed(2)}%)
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase block">Cumulative Net Profit</span>
            <span className={`tabular-nums font-semibold ${allTimeProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {allTimeProfit >= 0 ? '+' : ''}${allTimeProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 3: Portfolio Allocation & Win Rate */}
      <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition shadow-lg">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <PieChart className="w-3.5 h-3.5 text-indigo-400" />
              Allocation &amp; Win Rate
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300">
              {activePositions} Active {activePositions === 1 ? 'Stock' : 'Stocks'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-400 font-mono">Historical Win Rate</span>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Capital Deployed</span>
            <span className="text-zinc-200 tabular-nums">{capitalDeployed.toFixed(1)}%</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase block">Profit Factor</span>
            <span className="text-indigo-400 font-bold tabular-nums">
              {profitFactor > 0 ? profitFactor.toFixed(2) : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 4: Critic Risk & Autonomous Mode Control */}
      <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition shadow-lg">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Critic Drawdown Guard
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] border font-mono ${
                drawdownPct < maxDrawdownPct
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
              }`}
            >
              {drawdownPct.toFixed(2)}% / {maxDrawdownPct.toFixed(1)}% Limit
            </span>
          </div>

          {/* Drawdown Progress Bar */}
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden my-2">
            <div
              className={`h-full transition-all duration-500 ${
                drawdownPct < maxDrawdownPct * 0.7 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (drawdownPct / maxDrawdownPct) * 100)}%` }}
            />
          </div>
        </div>

        {/* Autonomous Mode Toggle */}
        <div className="pt-2 mt-1 border-t border-zinc-800/60 flex items-center justify-between">
          <div className="text-xs font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">Auto-Position Protection</span>
            <span className={`text-[11px] font-bold ${autoProtection ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {autoProtection ? 'ACTIVE (Auto-Stop/TP)' : 'ADVISORY ONLY'}
            </span>
          </div>

          <button
            onClick={handleToggleAutoProtection}
            disabled={togglingMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              autoProtection
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <Zap className="w-3 h-3" />
            {autoProtection ? 'Enabled' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
};
