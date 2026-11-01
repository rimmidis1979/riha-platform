import React, { useEffect, useState } from 'react';
import { Shield, Wallet, Save, RefreshCw } from 'lucide-react';
import {
  fetchCriticRiskGuardrails,
  fetchLivePortfolio,
  ProblemDetailError,
  updateCriticRiskGuardrails,
} from '../api/stockAiClient';
import {
  CriticRiskGuardrails,
  Rfc7807ProblemDetail,
  RobinhoodPortfolioSnapshot,
} from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';

export const PortfolioGuardrailsPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<RobinhoodPortfolioSnapshot | null>(null);
  const [guardrails, setGuardrails] = useState<CriticRiskGuardrails | null>(null);
  const [maxPositionSizeUsd, setMaxPositionSizeUsd] = useState<number>(25000);
  const [maxDailyDrawdownLimitPct, setMaxDailyDrawdownLimitPct] = useState<number>(3.0);
  const [convergenceThreshold, setConvergenceThreshold] = useState<number>(0.78);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);
  const [savingGuardrails, setSavingGuardrails] = useState(false);

  const loadPortfolioAndGuardrails = async () => {
    try {
      const rules = await fetchCriticRiskGuardrails();
      setGuardrails(rules);
      setMaxPositionSizeUsd(rules.maxPositionSizeUsd);
      setMaxDailyDrawdownLimitPct(rules.maxDailyDrawdownLimitPct);
      setConvergenceThreshold(rules.convergenceThreshold);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }

    try {
      const acct = await fetchLivePortfolio();
      setPortfolio(acct);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  };

  useEffect(() => {
    loadPortfolioAndGuardrails();
  }, []);

  const handleSaveGuardrails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGuardrails(true);
    try {
      const updated = await updateCriticRiskGuardrails({
        maxPositionSizeUsd,
        maxDailyDrawdownLimitPct,
        convergenceThreshold,
      });
      setGuardrails(updated);
      setProblem(null);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setSavingGuardrails(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Portfolio, Risk Guardrails &amp; Live P&amp;L
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Live Robinhood brokerage balances (riha-stock-ai-robinhood-mcp-server) &amp; real-time SpEL policy controls (riha-critic-engine)
          </p>
        </div>
        <button
          onClick={loadPortfolioAndGuardrails}
          className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          REFRESH LIVE STATE
        </button>
      </div>

      <ProblemDetailBanner problem={problem} onDismiss={() => setProblem(null)} />

      {/* Live Robinhood Account Balances */}
      <section className="onyx-glass rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4">
          <Wallet className="w-4 h-4 text-zinc-300" />
          Live Robinhood Brokerage Account &amp; P&amp;L
        </div>

        {!portfolio ? (
          <div className="text-xs font-mono text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-lg">
            Live Robinhood account feed disconnected (503 Service Unavailable). Inject ROBINHOOD_CLIENT_ID and ROBINHOOD_PRIVATE_KEY into riha-stock-ai-robinhood-mcp-server.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
              <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">BUYING POWER</span>
                <span className="text-base font-bold text-white">
                  ${portfolio.buyingPowerUsd.toLocaleString()}
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">CASH BALANCE</span>
                <span className="text-base font-bold text-zinc-200">
                  ${portfolio.liveCashBalance.toLocaleString()}
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">UNSETTLED FUNDS</span>
                <span className="text-base font-bold text-zinc-200">
                  ${portfolio.unsettledFundsUsd.toLocaleString()}
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">UNREALIZED P&amp;L</span>
                <span className="text-base font-bold text-zinc-200">
                  ${portfolio.unrealizedPnlUsd.toLocaleString()}
                </span>
              </div>
              <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                <span className="text-zinc-500 block">REALIZED P&amp;L</span>
                <span className="text-base font-bold text-zinc-200">
                  ${portfolio.realizedPnlUsd.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Real-Time Critic SpEL Guardrail Controls */}
      <section className="onyx-glass rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4">
          <Shield className="w-4 h-4 text-zinc-300" />
          Deterministic SpEL Risk Guardrail Controls (riha-critic-engine • productId = RIHA_STOCK_AI)
        </div>

        <form onSubmit={handleSaveGuardrails} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900/90 p-4 rounded-lg border border-zinc-800">
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              maxPositionSizeUsd (USD)
            </label>
            <input
              type="number"
              step="500"
              value={maxPositionSizeUsd}
              onChange={(e) => setMaxPositionSizeUsd(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm font-mono text-white"
            />
            <span className="text-[11px] font-mono text-zinc-500 mt-1 block">
              Enforces (#payload.quantity * #payload.limitPrice) &lt;= #context.maxPositionSizeUsd
            </span>
          </div>

          <div className="bg-zinc-900/90 p-4 rounded-lg border border-zinc-800">
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              maxDailyDrawdownLimitPct (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={maxDailyDrawdownLimitPct}
              onChange={(e) => setMaxDailyDrawdownLimitPct(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm font-mono text-white"
            />
            <span className="text-[11px] font-mono text-zinc-500 mt-1 block">
              Enforces #context.currentDailyDrawdownPct &lt; #context.maxDailyDrawdownLimitPct
            </span>
          </div>

          <div className="bg-zinc-900/90 p-4 rounded-lg border border-zinc-800 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                contract.convergenceThreshold (0.0 - 1.0)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="0.99"
                value={convergenceThreshold}
                onChange={(e) => setConvergenceThreshold(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm font-mono text-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingGuardrails}
              className="mt-3 w-full py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-mono text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {savingGuardrails ? 'UPDATING CRITIC ENGINE...' : 'COMMIT GUARDRAILS TO CRITIC ENGINE'}
            </button>
          </div>
        </form>

        {/* Active SpEL Rules Display */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-zinc-400">
            Active Deterministic SpEL Expressions in riha-critic-engine:
          </div>
          {(
            guardrails?.spelRules || [
              '#payload.confidenceScore >= #contract.convergenceThreshold',
              "#payload.limitPrice > 0 and #payload.stopLossPrice > 0 and (#payload.action == 'BUY' ? #payload.stopLossPrice < #payload.limitPrice : true)",
              '(#payload.quantity * #payload.limitPrice) <= #context.maxPositionSizeUsd',
              '#context.currentDailyDrawdownPct < #context.maxDailyDrawdownLimitPct',
            ]
          ).map((rule, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/80 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200"
            >
              {rule}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

