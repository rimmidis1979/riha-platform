import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sliders,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  DollarSign,
  Layers,
  Bot,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { StockApiClient } from '../../services/stockApiClient';

export interface StrategicLoopConfigTarget {
  symbol: string;
  companyName?: string;
  currentPrice: number;
  avgCost?: number;
  runStrategicLoop: boolean;
  executionMode: 'PAPERLESS' | 'ACTUAL';
  targetProfitMarginPct?: number;
  stopLossMarginPct?: number;
  autoBuyEnabled?: boolean;
  autoSellEnabled?: boolean;
  maxQuantity?: number;
  shares?: number;
}

interface StrategicLoopConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: StrategicLoopConfigTarget | null;
  onSaved: (updated: {
    symbol: string;
    runStrategicLoop: boolean;
    executionMode: 'PAPERLESS' | 'ACTUAL';
    targetProfitMarginPct: number;
    stopLossMarginPct: number;
    autoBuyEnabled: boolean;
    autoSellEnabled: boolean;
    maxQuantity: number;
  }) => void;
}

export const StrategicLoopConfigModal: React.FC<StrategicLoopConfigModalProps> = ({
  isOpen,
  onClose,
  target,
  onSaved,
}) => {
  if (!isOpen || !target) return null;

  const [runLoop, setRunLoop] = useState<boolean>(target.runStrategicLoop ?? true);
  const [execMode, setExecMode] = useState<'PAPERLESS' | 'ACTUAL'>(target.executionMode ?? 'PAPERLESS');
  const [profitMargin, setProfitMargin] = useState<number>(target.targetProfitMarginPct ?? 5.0);
  const [stopLossMargin, setStopLossMargin] = useState<number>(target.stopLossMarginPct ?? 3.0);
  const [autoBuy, setAutoBuy] = useState<boolean>(target.autoBuyEnabled ?? false);
  const [autoSell, setAutoSell] = useState<boolean>(target.autoSellEnabled ?? false);
  const [maxQty, setMaxQty] = useState<number>(target.maxQuantity ?? 1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setRunLoop(target.runStrategicLoop ?? true);
      setExecMode(target.executionMode ?? 'PAPERLESS');
      setProfitMargin(target.targetProfitMarginPct ?? 5.0);
      setStopLossMargin(target.stopLossMarginPct ?? 3.0);
      setAutoBuy(target.autoBuyEnabled ?? false);
      setAutoSell(target.autoSellEnabled ?? false);
      setMaxQty(target.maxQuantity ?? 1);
      setErrorMessage(null);
    }
  }, [target]);

  const costBasis = target.avgCost && target.avgCost > 0 ? target.avgCost : target.currentPrice;
  const targetProfitPrice = costBasis * (1 + profitMargin / 100);
  const stopLossPrice = costBasis * (1 - stopLossMargin / 100);

  const profitPresets = [3, 5, 8, 10, 15, 25];
  const stopLossPresets = [2, 3, 5, 7, 10];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await StockApiClient.updateStockStrategicLoop(
        target.symbol,
        runLoop,
        execMode,
        profitMargin,
        stopLossMargin,
        autoBuy,
        autoSell,
        maxQty
      );

      onSaved({
        symbol: target.symbol,
        runStrategicLoop: runLoop,
        executionMode: execMode,
        targetProfitMarginPct: profitMargin,
        stopLossMarginPct: stopLossMargin,
        autoBuyEnabled: autoBuy,
        autoSellEnabled: autoSell,
        maxQuantity: maxQty,
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update strategic loop settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111827] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto text-slate-100">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-slate-100">{target.symbol}</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {target.companyName || target.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Strategic Loop &amp; Autonomous Profit/Loss Threshold Configuration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRICE & COST BASIS OVERVIEW BAR */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#161d2d] border border-slate-800 font-mono text-center">
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-sans block font-semibold">Market Price</span>
            <span className="text-sm font-black text-slate-100">${target.currentPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-sans block font-semibold">Your Avg Cost</span>
            <span className="text-sm font-black text-slate-100">${costBasis.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-sans block font-semibold">Shares Owned</span>
            <span className="text-sm font-black text-slate-100">
              {typeof target.shares === 'number' ? target.shares.toFixed(2) : '1.00'}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. MASTER STRATEGIC LOOP TOGGLE */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#161d2d] shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-100 block flex items-center gap-1.5">
                  <Zap className={`w-4 h-4 ${runLoop ? 'text-emerald-400 fill-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  <span>Strategic Loop Active</span>
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Periodic 15-second multi-agent strategy scan across technicals, VWAP, RSI, and order flow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRunLoop(!runLoop)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${runLoop ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${runLoop ? 'translate-x-6' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 font-sans">Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full border ${runLoop ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
              >
                {runLoop ? '⚡ ACTIVE (Background Radar On)' : '⏸️ OFF (Manual Scan Only)'}
              </span>
            </div>
          </div>

          {/* 2. TARGET PROFIT GAIN THRESHOLD (%) */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#161d2d] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Target Profit Margin (%)</span>
              </label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 1)}
                  className="w-16 px-2 py-1 bg-[#0b0f19] border border-slate-700 rounded-lg text-sm font-bold text-slate-100 text-right focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <span className="text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 font-mono mr-1">Presets:</span>
              {profitPresets.map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => setProfitMargin(pct)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${profitMargin === pct
                      ? 'bg-emerald-600 text-white shadow-xs border-emerald-500'
                      : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border-emerald-800/60'
                    }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>

            {/* Dynamic Calculated Exit Price */}
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs flex items-center justify-between font-mono">
              <span className="text-emerald-300 font-sans">Target Take-Profit Exit Price:</span>
              <strong className="text-emerald-400 font-black text-sm">
                ${targetProfitPrice.toFixed(2)} (+{profitMargin.toFixed(1)}%)
              </strong>
            </div>
          </div>

          {/* 3. STOP-LOSS / DRAWDOWN MARGIN (%) */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#161d2d] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Stop-Loss Drawdown Margin (%)</span>
              </label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="50"
                  value={stopLossMargin}
                  onChange={(e) => setStopLossMargin(parseFloat(e.target.value) || 1)}
                  className="w-16 px-2 py-1 bg-[#0b0f19] border border-slate-700 rounded-lg text-sm font-bold text-slate-100 text-right focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <span className="text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 font-mono mr-1">Presets:</span>
              {stopLossPresets.map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => setStopLossMargin(pct)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${stopLossMargin === pct
                      ? 'bg-rose-600 text-white shadow-xs border-rose-500'
                      : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 border-rose-800/60'
                    }`}
                >
                  -{pct}%
                </button>
              ))}
            </div>

            {/* Dynamic Calculated Stop Price */}
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs flex items-center justify-between font-mono">
              <span className="text-rose-300 font-sans">Stop-Loss Trigger Price:</span>
              <strong className="text-rose-400 font-black text-sm">
                ${stopLossPrice.toFixed(2)} (-{stopLossMargin.toFixed(1)}%)
              </strong>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5 bg-[#0b0f19] p-2 rounded-lg border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Smart AI Oversold Guard:</strong> If RSI drops below 30 into extreme capitulation rebound zones, orchestrator avoids panic-selling at market bottoms.
              </span>
            </div>
          </div>

          {/* 4. AUTONOMOUS ORDER EXECUTION (AUTO-TRADING) */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#161d2d] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Autonomous Order Execution
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-mono">
                Auto-Trade Settings
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSell}
                  onChange={(e) => setAutoSell(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-700 bg-[#0b0f19] focus:ring-indigo-500"
                />
                <span className="font-semibold">
                  Auto-Sell position when Target Profit (+{profitMargin.toFixed(1)}%) or Stop-Loss is hit
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBuy}
                  onChange={(e) => setAutoBuy(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-700 bg-[#0b0f19] focus:ring-indigo-500"
                />
                <span className="font-semibold">
                  Auto-Buy additional shares on institutional Strong-Buy signals
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Max Shares per Auto-Order:</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={maxQty}
                onChange={(e) => setMaxQty(parseInt(e.target.value) || 1)}
                className="w-20 px-2 py-1 bg-[#0b0f19] border border-slate-700 rounded-lg text-xs font-bold font-mono text-slate-100 text-right focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 5. EXECUTION PIPELINE MODE */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Execution Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExecMode('PAPERLESS')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${execMode === 'PAPERLESS'
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-xs'
                    : 'bg-[#161d2d] text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
              >
                Paperless Sandbox
              </button>
              <button
                type="button"
                onClick={() => setExecMode('ACTUAL')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${execMode === 'ACTUAL'
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 shadow-xs'
                    : 'bg-[#161d2d] text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
              >
                Robinhood Live API
              </button>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


