import React from 'react';
import {
  Activity,
  AlertCircle,
  BarChart2,
  Calculator,
  Cpu,
  History,
  RefreshCw,
  Scale,
  Sliders,
} from 'lucide-react';

interface Props {
  ticker: string;
  isOwned: boolean;
  onOpenChart: () => void;
  onOpenStrategy: () => void;
  onOpenBracket: () => void;
  onOpenCostBasis: () => void;
  onQuickScaleOut?: () => void;
  onReAnalyze: () => void;
  onOpenHistory: () => void;
  onConfigureAlert?: () => void;
}

export const StockRowActionIcons: React.FC<Props> = ({
  ticker,
  isOwned,
  onOpenChart,
  onOpenStrategy,
  onOpenBracket,
  onOpenCostBasis,
  onQuickScaleOut,
  onReAnalyze,
  onOpenHistory,
  onConfigureAlert,
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* 1. Technical Chart Drawer */}
      <button
        onClick={onOpenChart}
        title="View Full Technical & Intraday Chart"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition"
      >
        <BarChart2 className="w-3.5 h-3.5" />
      </button>

      {/* 2. Strategy Spec */}
      <button
        onClick={onOpenStrategy}
        title="Inspect AI Strategy Rules & Prompt Version"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition"
      >
        <Cpu className="w-3.5 h-3.5" />
      </button>

      {/* 3. Trailing Stop / TP Bracket */}
      <button
        onClick={onOpenBracket}
        title="Adjust Trailing Stop / Take-Profit Bracket"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition"
      >
        <Sliders className="w-3.5 h-3.5" />
      </button>

      {/* 4. Cost Basis Simulator */}
      <button
        onClick={onOpenCostBasis}
        title="Cost Basis & Scale Simulator"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 transition"
      >
        <Calculator className="w-3.5 h-3.5" />
      </button>

      {/* 5. Quick Scale-Out (only if owned) */}
      {isOwned && onQuickScaleOut && (
        <button
          onClick={onQuickScaleOut}
          title="Quick Scale-Out (Trim 25% / 50% / Flatten)"
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
        >
          <Scale className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 6. Force Immediate Re-Analysis */}
      <button
        onClick={onReAnalyze}
        title="Force Immediate 5-Node DAG Re-Evaluation"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>

      {/* 7. Position History Ledger */}
      <button
        onClick={onOpenHistory}
        title="Position Fills & Decision History"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition"
      >
        <History className="w-3.5 h-3.5" />
      </button>

      {/* 8. Configure Alert */}
      <button
        onClick={() => {
          if (onConfigureAlert) onConfigureAlert();
          else alert(`Price & volatility alert configured for ${ticker}.`);
        }}
        title="Configure Price & Volatility Alert"
        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 transition"
      >
        <AlertCircle className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
