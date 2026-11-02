import React from 'react';
import { TrendingStock } from '../../types/trending';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  TrendingDown,
  Star,
  PlusCircle,
  FileText,
  BrainCircuit,
  Zap,
  Target,
  ShieldAlert,
} from 'lucide-react';

interface TrendingStockCardProps {
  stock: TrendingStock;
}

export const TrendingStockCard: React.FC<TrendingStockCardProps> = ({ stock }) => {
  const { togglePersonalizedStock, openTradeModal } = useTrading();
  const isPositive = stock.change >= 0;
  const decision = stock.promptDecision;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
      <div>
        {/* Top Header: Ticker, Name, Sector, and Star Toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-800 text-sm border border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors">
              {stock.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-base font-mono">{stock.symbol}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200/60">
                  {stock.sector}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">{stock.companyName}</p>
            </div>
          </div>

          {/* Star Button: Add/Remove from Personalized Selection */}
          <button
            onClick={() => togglePersonalizedStock(stock.symbol)}
            title={stock.isPersonalized ? 'Remove from Personalized Selection' : 'Add to Personalized Selection'}
            className={`p-2 rounded-xl transition-all ${
              stock.isPersonalized
                ? 'bg-amber-50 text-amber-500 border border-amber-200 shadow-sm'
                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-amber-500 hover:bg-amber-50/50'
            }`}
          >
            <Star className={`w-5 h-5 ${stock.isPersonalized ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Price & Day Change */}
        <div className="flex items-baseline justify-between mt-4 pb-3 border-b border-slate-100">
          <div>
            <div className="text-2xl font-black font-mono text-slate-900">
              ${stock.price.toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono">
              <span
                className={`flex items-center font-bold px-1.5 py-0.5 rounded-md ${
                  isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                {isPositive ? '+' : ''}
                {stock.change.toFixed(2)} ({isPositive ? '+' : ''}
                {stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">Momentum</div>
            <div className="text-sm font-bold font-mono text-blue-600 flex items-center justify-end gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              <span>{stock.momentumScore}/100</span>
            </div>
            {stock.relativeVolume && (
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                RVOL: <strong className="text-slate-800">{stock.relativeVolume.toFixed(1)}x</strong>
              </div>
            )}
          </div>
        </div>

        {/* Momentum Trading Analyst Prompt Decision Block (If Evaluated) */}
        {decision && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-blue-800">
                <BrainCircuit className="w-3.5 h-3.5 text-blue-600" />
                Prompt Decision:
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                  decision.action === 'BUY'
                    ? 'bg-emerald-600 text-white'
                    : decision.action === 'HOLD'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-600 text-white'
                }`}
              >
                {decision.action} ({Math.round(decision.confidence * 100)}%)
              </span>
            </div>

            <p className="text-[11px] text-slate-700 leading-snug">
              {decision.reasoning}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-200/60 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                <Target className="w-3 h-3 text-emerald-600" />
                <span>Target: ${decision.target_price.toFixed(2)} (+5%)</span>
              </div>
              <div className="flex items-center gap-1 text-rose-800 font-semibold justify-end">
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>Stop: ${decision.stop_loss.toFixed(2)} (-2%)</span>
              </div>
            </div>
          </div>
        )}

        {/* SEC Filing / Catalyst Tag */}
        {stock.recentFiling && (
          <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <FileText className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="leading-tight">
              <span className="font-bold text-amber-800">SEC {stock.recentFiling.formType}: </span>
              <span className="text-[11px] text-amber-900">{stock.recentFiling.title}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer: Quick Buy */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 font-mono">
          Vol: <strong className="text-slate-800">{stock.volume}</strong>
        </span>

        <button
          onClick={() =>
            openTradeModal({
              symbol: stock.symbol,
              companyName: stock.companyName,
              currentPrice: stock.price,
              defaultSide: 'BUY',
            })
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Quick Buy</span>
        </button>
      </div>
    </div>
  );
};
