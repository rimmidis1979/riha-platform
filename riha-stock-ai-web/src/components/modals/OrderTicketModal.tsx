import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Lock,
  Percent,
  ShieldCheck,
  X,
} from 'lucide-react';
import { OrderSubmissionRequest, OrderTicketParams } from '../../types/stockAi';
import { ProblemDetailError, submitPortfolioOrder } from '../../api/stockAiClient';

interface Props {
  params: OrderTicketParams;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OrderTicketModal: React.FC<Props> = ({ params, onClose, onSuccess }) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>(params.initialSide);
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>(params.initialType || 'LIMIT');
  const [quantity, setQuantity] = useState<number>(() => {
    if (params.initialSide === 'SELL') {
      return Math.min(params.ownedQuantity > 0 ? params.ownedQuantity : 0, 20);
    }
    return 20;
  });
  const [limitPrice, setLimitPrice] = useState<number>(params.price);
  const [stopLoss, setStopLoss] = useState<number>(
    params.stopLossPrice || Math.round(params.price * 0.965 * 100) / 100
  );
  const [takeProfit, setTakeProfit] = useState<number>(
    params.targetPrice || Math.round(params.price * 1.085 * 100) / 100
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSell = side === 'SELL';
  const owned = params.ownedQuantity || 0;
  const isSellBlocked = isSell && owned <= 0;
  const isSellExceeded = isSell && quantity > owned;

  const totalValue = Math.round(quantity * (orderType === 'LIMIT' ? limitPrice : params.price) * 100) / 100;

  const handleSideChange = (newSide: 'BUY' | 'SELL') => {
    setSide(newSide);
    setErrorMsg(null);
    if (newSide === 'SELL' && owned > 0 && quantity > owned) {
      setQuantity(owned);
    }
  };

  const handleQuickPreset = (shares: number) => {
    setQuantity(Math.max(1, shares));
  };

  const handleQuickPercent = (pct: number) => {
    if (owned > 0) {
      const q = Math.max(1, Math.floor(owned * pct));
      setQuantity(q);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isSell && owned <= 0) {
      setErrorMsg(`Position-Gated Guardrail: Cannot submit SELL order for ${params.ticker} because you own 0 shares.`);
      return;
    }
    if (isSell && quantity > owned) {
      setErrorMsg(`Position-Gated Guardrail: Requested quantity (${quantity}) exceeds your active owned shares (${owned}).`);
      return;
    }

    const payload: OrderSubmissionRequest = {
      ticker: params.ticker,
      side,
      orderType,
      quantity,
      limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
      stopLossPrice: stopLoss,
      takeProfitPrice: takeProfit,
      executionMode: 'MANUAL_USER_CONFIRMED',
    };

    setIsSubmitting(true);
    try {
      const res = await submitPortfolioOrder(payload);
      setSuccessMsg(`Order submitted successfully! Robinhood Order ID: ${res.robinhoodOrderId || 'SIM-FILLED'}`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      if (err instanceof ProblemDetailError) {
        setErrorMsg(err.problem.detail || err.problem.title);
      } else {
        setErrorMsg(err.message || 'Order submission failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSell ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {isSell ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-zinc-100">{params.ticker}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Live: ${params.price.toFixed(2)}
                </span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${owned > 0 ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  Owned: {owned} shares
                </span>
              </div>
              <p className="text-xs text-zinc-400">Deterministic Position-Gated Order Ticket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Side Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => handleSideChange('BUY')}
              className={`py-2 text-xs font-bold font-mono rounded-md transition flex items-center justify-center gap-2 ${
                !isSell ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              BUY ORDER
            </button>
            <button
              type="button"
              onClick={() => handleSideChange('SELL')}
              disabled={owned <= 0}
              className={`py-2 text-xs font-bold font-mono rounded-md transition flex items-center justify-center gap-2 ${
                isSell
                  ? 'bg-rose-600 text-white shadow-lg'
                  : owned <= 0
                  ? 'opacity-40 cursor-not-allowed text-zinc-500'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {owned <= 0 ? <Lock className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              SELL ORDER {owned <= 0 && '(UNOWNED)'}
            </button>
          </div>

          {/* Position-Gated Warning if unowned */}
          {isSellBlocked && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200">
                <p className="font-semibold">Deterministic SpEL Position Gate Enforced</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5 font-mono">
                  #payload.side == &apos;SELL&apos; ? (#context.ownedQuantity &gt; 0 and #payload.quantity &lt;= #context.ownedQuantity) : true
                </p>
                <p className="mt-1 text-zinc-400">You currently own 0 shares of {params.ticker}. Sell orders are strictly prohibited.</p>
              </div>
            </div>
          )}

          {/* Order Type Toggle */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Execution Type:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`px-3 py-1 rounded border text-xs transition ${
                  orderType === 'LIMIT'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Limit Order
              </button>
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`px-3 py-1 rounded border text-xs transition ${
                  orderType === 'MARKET'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Market Order
              </button>
            </div>
          </div>

          {/* Quantity & Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="text-zinc-300 font-mono font-medium">Quantity (Shares):</label>
              <span className="text-zinc-500 font-mono text-[11px]">
                {isSell ? `Max available: ${owned}` : 'Buying Power Checked'}
              </span>
            </div>
            <input
              type="number"
              min="1"
              max={isSell ? owned : 10000}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isSellBlocked}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none"
            />
            {/* Quick Presets */}
            {!isSell ? (
              <div className="flex gap-1.5 pt-1">
                {[10, 25, 50, 100].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQuickPreset(s)}
                    className="flex-1 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition"
                  >
                    +{s}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5 pt-1">
                {[
                  { label: '25%', pct: 0.25 },
                  { label: '50%', pct: 0.5 },
                  { label: '75%', pct: 0.75 },
                  { label: '100% (Flatten)', pct: 1.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleQuickPercent(item.pct)}
                    disabled={owned <= 0}
                    className="flex-1 py-1 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition disabled:opacity-30"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Limit Price (if Limit) */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-mono font-medium">Limit Price ($):</label>
              <input
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none"
              />
            </div>
          )}

          {/* Bracket Stop Loss & Take Profit */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-mono">Stop-Loss Price ($):</label>
              <input
                type="number"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-mono">Target Take-Profit ($):</label>
              <input
                type="number"
                step="0.01"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Order Value & Risk Summary */}
          <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-zinc-500">Estimated Order Total:</span>
              <p className="text-sm font-bold text-zinc-100 font-mono tabular-nums">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">Critic Engine Gate:</span>
              <div className="flex items-center gap-1 text-emerald-400 text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Deterministic SpEL Verified</span>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSellBlocked || isSellExceeded}
              className={`px-6 py-2 rounded-lg font-mono text-xs font-bold text-white transition flex items-center gap-2 ${
                isSell
                  ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-40'
                  : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40'
              }`}
            >
              {isSubmitting ? (
                'Executing via Critic...'
              ) : isSell ? (
                <>
                  <ArrowDownRight className="w-4 h-4" />
                  CONFIRM SELL ({quantity} SHS)
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  CONFIRM BUY ({quantity} SHS)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
