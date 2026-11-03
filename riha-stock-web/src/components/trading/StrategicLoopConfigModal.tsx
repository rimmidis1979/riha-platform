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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-slate-900">{target.symbol}</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600">
                  {target.companyName || target.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Strategic Loop &amp; Autonomous Profit/Loss Threshold Configuration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRICE & COST BASIS OVERVIEW BAR */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 font-mono text-center">
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-sans block font-semibold">Market Price</span>
            <span className="text-sm font-black text-slate-900">${target.currentPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-sans block font-semibold">Your Avg Cost</span>
            <span className="text-sm font-black text-slate-900">${costBasis.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-sans block font-semibold">Shares Owned</span>
            <span className="text-sm font-black text-slate-900">
              {typeof target.shares === 'number' ? target.shares.toFixed(2) : '1.00'}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. MASTER STRATEGIC LOOP TOGGLE */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-900 block flex items-center gap-1.5">
                  <Zap className={`w-4 h-4 ${runLoop ? 'text-emerald-600 fill-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                  <span>Strategic Loop Active</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periodic 15-second multi-agent strategy scan across technicals, VWAP, RSI, and order flow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRunLoop(!runLoop)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                  runLoop ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    runLoop ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 font-sans">Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${
                  runLoop ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {runLoop ? '⚡ ACTIVE (Background Radar On)' : '⏸️ OFF (Manual Scan Only)'}
              </span>
            </div>
          </div>

          {/* 2. TARGET PROFIT GAIN THRESHOLD (%) */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
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
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-right focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 font-sans mr-1">Presets:</span>
              {profitPresets.map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => setProfitMargin(pct)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    profitMargin === pct
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>

            {/* Dynamic Calculated Exit Price */}
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs flex items-center justify-between font-mono">
              <span className="text-emerald-800 font-sans">Target Take-Profit Exit Price:</span>
              <strong className="text-emerald-900 font-black text-sm">
                ${targetProfitPrice.toFixed(2)} (+{profitMargin.toFixed(1)}%)
              </strong>
            </div>
          </div>

          {/* 3. STOP-LOSS / DRAWDOWN MARGIN (%) */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingDown className="w-4 h-4 text-rose-600" />
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
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-right focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 font-sans mr-1">Presets:</span>
              {stopLossPresets.map((pct) => (
                <button
                  type="button"
                  key={pct}
                  onClick={() => setStopLossMargin(pct)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    stopLossMargin === pct
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  -{pct}%
                </button>
              ))}
            </div>

            {/* Dynamic Calculated Stop Price */}
            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs flex items-center justify-between font-mono">
              <span className="text-rose-800 font-sans">Stop-Loss Trigger Price:</span>
              <strong className="text-rose-900 font-black text-sm">
                ${stopLossPrice.toFixed(2)} (-{stopLossMargin.toFixed(1)}%)
              </strong>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Smart AI Oversold Guard:</strong> If RSI drops below 30 into extreme capitulation rebound zones, orchestrator avoids panic-selling at market bottoms.
              </span>
            </div>
          </div>

          {/* 4. AUTONOMOUS ORDER EXECUTION (AUTO-TRADING) */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Autonomous Order Execution
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                Auto-Trade Settings
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSell}
                  onChange={(e) => setAutoSell(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="font-semibold">
                  Auto-Sell position when Target Profit (+{profitMargin.toFixed(1)}%) or Stop-Loss is hit
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBuy}
                  onChange={(e) => setAutoBuy(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                />
                <span className="font-semibold">
                  Auto-Buy additional shares on institutional Strong-Buy signals
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Max Shares per Auto-Order:</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={maxQty}
                onChange={(e) => setMaxQty(parseInt(e.target.value) || 1)}
                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 text-right focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 5. EXECUTION PIPELINE MODE */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Execution Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExecMode('PAPERLESS')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  execMode === 'PAPERLESS'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-400 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Paperless Sandbox
              </button>
              <button
                type="button"
                onClick={() => setExecMode('ACTUAL')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  execMode === 'ACTUAL'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-400 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Robinhood Live API
              </button>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
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
