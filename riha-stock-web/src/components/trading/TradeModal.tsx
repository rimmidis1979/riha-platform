import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { useAuth } from '../../context/AuthContext';
import { OrderSide, OrderType } from '../../types/trading';
import { X, ArrowDownRight, ArrowUpRight, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

export const TradeModal: React.FC = () => {
  const { selectedStockForTrade, closeTradeModal, executeBuy, executeSell, holdings } = useTrading();
  const { user } = useAuth();

  if (!selectedStockForTrade) return null;

  const currentHolding = holdings.find((h) => h.symbol === selectedStockForTrade.symbol);
  const sharesOwned = currentHolding?.shares || 0;
  const cashAvailable = user?.cashBalance || 0;

  const [side, setSide] = useState<OrderSide>(selectedStockForTrade.defaultSide || 'BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [shares, setShares] = useState<string>('10');
  const [limitPrice, setLimitPrice] = useState<string>(selectedStockForTrade.currentPrice.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStockForTrade.defaultSide) {
      setSide(selectedStockForTrade.defaultSide);
    }
    setLimitPrice(selectedStockForTrade.currentPrice.toFixed(2));
  }, [selectedStockForTrade]);

  const numShares = Math.max(0, parseInt(shares, 10) || 0);
  const effectivePrice = orderType === 'LIMIT' ? parseFloat(limitPrice) || selectedStockForTrade.currentPrice : selectedStockForTrade.currentPrice;
  const totalCost = +(numShares * effectivePrice).toFixed(2);

  // Quick shares buttons
  const handleSetSharesFraction = (pct: number) => {
    if (side === 'BUY') {
      const maxAffordable = Math.floor(cashAvailable / effectivePrice);
      setShares(Math.max(1, Math.floor(maxAffordable * pct)).toString());
    } else {
      setShares(Math.max(1, Math.floor(sharesOwned * pct)).toString());
    }
  };

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numShares <= 0) {
      setError('Please enter a valid share quantity greater than 0.');
      return;
    }

    if (side === 'BUY' && totalCost > cashAvailable) {
      setError(`Insufficient cash balance (\$${cashAvailable.toLocaleString()}) for \$${totalCost.toLocaleString()} purchase.`);
      return;
    }

    if (side === 'SELL' && numShares > sharesOwned) {
      setError(`Cannot sell ${numShares} shares. You currently own ${sharesOwned} shares.`);
      return;
    }

    setIsSubmitting(true);
    let success = false;

    if (side === 'BUY') {
      success = await executeBuy(
        selectedStockForTrade.symbol,
        selectedStockForTrade.companyName,
        numShares,
        effectivePrice,
        orderType
      );
    } else {
      success = await executeSell(
        selectedStockForTrade.symbol,
        selectedStockForTrade.companyName,
        numShares,
        effectivePrice,
        orderType
      );
    }

    setIsSubmitting(false);
    if (!success) {
      setError('Execution rejected by trading guardrails.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-lg font-mono text-white border border-zinc-700">
              {selectedStockForTrade.symbol}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Trade {selectedStockForTrade.symbol}
              </h3>
              <p className="text-xs text-zinc-400">{selectedStockForTrade.companyName}</p>
            </div>
          </div>

          <button
            onClick={closeTradeModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleTradeSubmit} className="p-6 space-y-5">
          {/* Buy / Sell Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setSide('BUY');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                side === 'BUY'
                  ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              BUY {selectedStockForTrade.symbol}
            </button>

            <button
              type="button"
              onClick={() => {
                setSide('SELL');
                setError(null);
              }}
              disabled={sharesOwned === 0}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                side === 'SELL'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : sharesOwned === 0
                  ? 'opacity-40 cursor-not-allowed text-zinc-600'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              SELL ({sharesOwned} Owned)
            </button>
          </div>

          {/* Account Context: Cash or Shares Available */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs font-mono">
            <span className="text-zinc-400">
              {side === 'BUY' ? 'Available Buying Power' : 'Shares in Portfolio'}:
            </span>
            <span className="font-bold text-emerald-400">
              {side === 'BUY' ? `$${cashAvailable.toLocaleString()}` : `${sharesOwned} Shares`}
            </span>
          </div>

          {/* Order Type & Price Input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="MARKET">Market Order</option>
                <option value="LIMIT">Limit Order</option>
                <option value="STOP_LOSS">Stop Loss</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                {orderType === 'LIMIT' ? 'Limit Price ($)' : 'Market Price ($)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  readOnly={orderType === 'MARKET'}
                  value={orderType === 'MARKET' ? selectedStockForTrade.currentPrice.toFixed(2) : limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className={`w-full pl-3 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 focus:outline-none ${
                    orderType === 'MARKET' ? 'bg-zinc-900/60 text-zinc-400 cursor-not-allowed' : 'focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Shares Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">Share Quantity</label>
              <div className="flex items-center gap-1.5">
                {[0.25, 0.5, 0.75, 1.0].map((fraction) => (
                  <button
                    key={fraction}
                    type="button"
                    onClick={() => handleSetSharesFraction(fraction)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors"
                  >
                    {fraction === 1.0 ? 'MAX' : `${fraction * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="number"
              min="1"
              value={shares}
              onChange={(e) => {
                setShares(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. 10"
            />
          </div>

          {/* Cost Summary Breakdown */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Estimated Execution Price:</span>
              <span className="text-zinc-200">${effectivePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Commission & SEC Trading Fees:</span>
              <span className="text-emerald-400">$0.00 (Zero Fee)</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold">
              <span className="text-zinc-200">
                {side === 'BUY' ? 'Total Cost' : 'Total Estimated Proceeds'}:
              </span>
              <span className={side === 'BUY' ? 'text-emerald-400' : 'text-sky-400'}>
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || numShares <= 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg ${
              side === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
            } ${isSubmitting || numShares <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Executing Order on Exchange...
              </span>
            ) : (
              <span>
                CONFIRM {side} {numShares} {selectedStockForTrade.symbol} ($
                {totalCost.toLocaleString()})
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
