import React, { useState } from 'react';
import { ShieldCheck, Sliders, Target, TrendingDown, X } from 'lucide-react';

interface Props {
  ticker: string;
  currentPrice: number;
  initialStopLoss: number;
  initialTarget: number;
  onClose: () => void;
  onSave?: (stopLoss: number, target: number, trailingOffsetPct: number) => void;
}

export const SmartBracketModal: React.FC<Props> = ({
  ticker,
  currentPrice,
  initialStopLoss,
  initialTarget,
  onClose,
  onSave,
}) => {
  const [stopLoss, setStopLoss] = useState(initialStopLoss);
  const [target, setTarget] = useState(initialTarget);
  const [trailingOffsetPct, setTrailingOffsetPct] = useState(2.5);
  const [saved, setSaved] = useState(false);

  const riskPerShare = Math.max(0, currentPrice - stopLoss);
  const rewardPerShare = Math.max(0, target - currentPrice);
  const riskReward = riskPerShare > 0 ? (rewardPerShare / riskPerShare).toFixed(2) : '--';

  const handleSave = () => {
    if (onSave) onSave(stopLoss, target, trailingOffsetPct);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-zinc-100">{ticker}</span>
                <span className="text-xs font-mono text-zinc-400">Smart Bracket Studio</span>
              </div>
              <p className="text-xs text-zinc-500">Autonomous Stop-Loss &amp; Trailing Offset</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs font-mono">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center">
            <span className="text-zinc-400">Live Market Price:</span>
            <span className="text-sm font-bold text-zinc-100 tabular-nums">${currentPrice.toFixed(2)}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-300 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Dynamic Hard Stop-Loss ($):
            </label>
            <input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Take-Profit Target ($):
            </label>
            <input
              type="number"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-zinc-300">Trailing Stop Step-Up (%):</label>
              <span className="text-emerald-400 font-bold">{trailingOffsetPct}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={trailingOffsetPct}
              onChange={(e) => setTrailingOffsetPct(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex justify-between items-center">
            <span className="text-zinc-500">Calculated R/R Ratio:</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{riskReward} : 1</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition flex items-center gap-1.5"
          >
            {saved ? <ShieldCheck className="w-4 h-4" /> : null}
            {saved ? 'Updated!' : 'Apply Bracket'}
          </button>
        </div>
      </div>
    </div>
  );
};

