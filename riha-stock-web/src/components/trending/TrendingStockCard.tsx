import React from 'react';
import { TrendingStock } from '../../types/trending';
import { useTrading } from '../../context/TradingContext';
import { getStockName, TickerHoverLabel } from '../../utils/stockNames';
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
  Clock,
} from 'lucide-react';
import { formatReleaseDateTime } from '../../utils/dateTimeFormat';

interface TrendingStockCardProps {
  stock: TrendingStock;
}

export const TrendingStockCard: React.FC<TrendingStockCardProps> = ({ stock }) => {
  const { togglePersonalizedStock, openTradeModal } = useTrading();
  const isPositive = stock.change >= 0;
  const decision = stock.promptDecision;

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:border-indigo-500/50 transition-all group">
      <div>
        {/* Top Header: Ticker, Name, Sector, and Star Toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              title={`${stock.symbol} — ${getStockName(stock.symbol, stock.companyName)}`}
              className="w-11 h-11 rounded-xl bg-[#161d2d] flex items-center justify-center font-mono font-bold text-slate-200 text-sm border border-slate-700 group-hover:border-indigo-500 group-hover:bg-indigo-950/30 transition-colors cursor-pointer"
            >
              {stock.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <TickerHoverLabel
                  ticker={stock.symbol}
                  name={stock.companyName}
                  badgeClassName="text-slate-100 text-base"
                />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {stock.sector}
                </span>
              </div>
              <p
                title={getStockName(stock.symbol, stock.companyName)}
                className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5 cursor-pointer hover:text-slate-200"
              >
                {getStockName(stock.symbol, stock.companyName)}
              </p>
            </div>
          </div>

          {/* Star Button: Add/Remove from Personalized Selection */}
          <button
            onClick={() => togglePersonalizedStock(stock.symbol)}
            title={stock.isPersonalized ? 'Remove from Personalized Selection' : 'Add to Personalized Selection'}
            className={`p-2 rounded-xl transition-all ${
              stock.isPersonalized
                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/70 shadow-sm'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-amber-400 hover:bg-slate-700'
            }`}
          >
            <Star className={`w-5 h-5 ${stock.isPersonalized ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Price & Day Change */}
        <div className="flex items-baseline justify-between mt-4 pb-3 border-b border-slate-800">
          <div>
            <div className="text-2xl font-black font-mono text-slate-100">
              ${stock.price.toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono">
              <span
                className={`flex items-center font-bold px-1.5 py-0.5 rounded-md ${
                  isPositive ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800/60' : 'text-rose-400 bg-rose-950/70 border border-rose-800/60'
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
            <div className="text-sm font-bold font-mono text-indigo-400 flex items-center justify-end gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
              <span>{stock.momentumScore}/100</span>
            </div>
            {stock.relativeVolume && (
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                RVOL: <strong className="text-slate-200">{stock.relativeVolume.toFixed(1)}x</strong>
              </div>
            )}
          </div>
        </div>

        {/* Momentum Trading Analyst Prompt Decision Block (If Evaluated) */}
        {decision && (
          <div className="mt-3 p-3 rounded-xl bg-[#161d2d] border border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-indigo-300 font-mono">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                Prompt Decision:
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                  decision.action === 'BUY'
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                    : decision.action === 'HOLD'
                    ? 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                    : 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                }`}
              >
                {decision.action} ({Math.round(decision.confidence * 100)}%)
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              {decision.reasoning}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>Target: ${decision.target_price.toFixed(2)} (+5%)</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400 font-semibold justify-end">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Stop: ${decision.stop_loss.toFixed(2)} (-2%)</span>
              </div>
            </div>
          </div>
        )}

        {/* SEC Filing / Catalyst Tag */}
        {stock.recentFiling && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-300 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-amber-200">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>SEC {stock.recentFiling.formType}</span>
              </div>
              {stock.recentFiling.filingDate && (
                <span className="text-[10px] font-mono text-amber-400/90 font-semibold flex items-center gap-1 tabular-nums">
                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                  <span>Released: {formatReleaseDateTime(stock.recentFiling.filingDate)}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-300/90 line-clamp-1">{stock.recentFiling.title}</p>
          </div>
        )}

        {/* Live News Wire Release */}
        {stock.recentNews && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-blue-300">
                <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{stock.recentNews.source || 'News Wire'}</span>
              </div>
              {stock.recentNews.publishedAt && (
                <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1 tabular-nums">
                  <Clock className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Released: {formatReleaseDateTime(stock.recentNews.publishedAt)}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-1">{stock.recentNews.headline}</p>
          </div>
        )}
      </div>

      {/* Action Footer: Quick Buy */}
      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400 font-mono">
          Vol: <strong className="text-slate-200">{stock.volume}</strong>
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Quick Buy</span>
        </button>
      </div>
    </div>
  );
};
