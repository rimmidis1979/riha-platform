import React, { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, X } from 'lucide-react';

interface Props {
  ticker: string;
  ownedQuantity: number;
  averageCostPrice: number;
  liveMarketPrice: number;
  onClose: () => void;
}

export const CostBasisCalculatorModal: React.FC<Props> = ({
  ticker,
  ownedQuantity,
  averageCostPrice,
  liveMarketPrice,
  onClose,
}) => {
  const [scaleShares, setScaleShares] = useState(25);
  const [scalePrice, setScalePrice] = useState(liveMarketPrice);

  const currentTotalCost = ownedQuantity * averageCostPrice;
  const newShares = ownedQuantity + scaleShares;
  const newTotalCost = currentTotalCost + scaleShares * scalePrice;
  const newAverageCost = newShares > 0 ? newTotalCost / newShares : 0;

  // Trim simulation
  const [trimShares, setTrimShares] = useState(Math.min(ownedQuantity, 10));
  const trimPrice = liveMarketPrice;
  const realizedPnlFromTrim = trimShares * (trimPrice - averageCostPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-zinc-100">{ticker}</span>
                <span className="text-xs font-mono text-zinc-400">Cost Basis &amp; Scale Studio</span>
              </div>
              <p className="text-xs text-zinc-500">Position Sizing &amp; Profit Realization Simulator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs font-mono">
          {/* Current State */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-zinc-500 block text-[10px]">CURRENT SHARES</span>
              <span className="text-sm font-bold text-zinc-100">{ownedQuantity}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">AVG COST BASIS</span>
              <span className="text-sm font-bold text-zinc-100">${averageCostPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">LIVE MARKET</span>
              <span className="text-sm font-bold text-emerald-400">${liveMarketPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Scale-In Simulation */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-3">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Scale-In (Buy Additional Shares) Simulator:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Add Shares:</label>
                <input
                  type="number"
                  min="1"
                  value={scaleShares}
                  onChange={(e) => setScaleShares(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">At Price ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={scalePrice}
                  onChange={(e) => setScalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Simulated New Cost Basis:</span>
              <span className="text-sm font-bold text-emerald-300 tabular-nums">
                ${newAverageCost.toFixed(2)} ({newShares} total shares)
              </span>
            </div>
          </div>

          {/* Scale-Out / Trim Simulation */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-3">
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Scale-Out / Trim Profit Lock-In:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Trim Shares (Max {ownedQuantity}):</label>
                <input
                  type="number"
                  min="1"
                  max={ownedQuantity}
                  value={trimShares}
                  onChange={(e) => setTrimShares(Math.min(ownedQuantity, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Lock-In Price ($):</label>
                <input
                  type="number"
                  step="0.01"
                  disabled
                  value={trimPrice}
                  className="w-full bg-zinc-900/40 border border-zinc-800/60 rounded px-2.5 py-1.5 text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Realized Profit from Trim:</span>
              <span className={`text-sm font-bold tabular-nums ${realizedPnlFromTrim >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {realizedPnlFromTrim >= 0 ? '+' : ''}${realizedPnlFromTrim.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

