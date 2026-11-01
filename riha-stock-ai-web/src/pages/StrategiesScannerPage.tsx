import React, { useEffect, useState } from 'react';
import { GitCommit, Play, RefreshCw, Sliders } from 'lucide-react';
import {
  bindStrategyToPromptVersion,
  fetchLiveWatchlist,
  fetchStrategies,
  ProblemDetailError,
  triggerImmediateEvaluation,
} from '../api/stockAiClient';
import {
  AiTradeDecision,
  LiveWatchlistQuote,
  Rfc7807ProblemDetail,
  StrategyPromptBinding,
} from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';
import { DecisionXRayDrawer } from '../components/DecisionXRayDrawer';

export const StrategiesScannerPage: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyPromptBinding[]>([]);
  const [watchlist, setWatchlist] = useState<LiveWatchlistQuote[]>([]);
  const [versionInputs, setVersionInputs] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [inspectedDecision, setInspectedDecision] = useState<AiTradeDecision | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const strats = await fetchStrategies();
      setStrategies(strats);
      const initVersions: Record<string, string> = {};
      strats.forEach((s) => {
        initVersions[s.strategyId] = s.boundSemanticVersion;
      });
      setVersionInputs(initVersions);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }

    try {
      const quotes = await fetchLiveWatchlist();
      setWatchlist(quotes);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleBindVersion = async (strategy: StrategyPromptBinding) => {
    const newVersion = versionInputs[strategy.strategyId] || strategy.boundSemanticVersion;
    try {
      const updated = await bindStrategyToPromptVersion(
        strategy.strategyId,
        strategy.promptName,
        newVersion,
        'PUBLISHED'
      );
      setStrategies((prev) =>
        prev.map((s) => (s.strategyId === updated.strategyId ? updated : s))
      );
      setProblem(null);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  };

  const handleTriggerEvaluation = async (ticker: string, strategyId?: string) => {
    setLoading(true);
    try {
      const decision = await triggerImmediateEvaluation(ticker, strategyId);
      setInspectedDecision(decision);
      setProblem(null);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Active Strategy Control &amp; Live Ticker Scanner
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Bind active trading strategies to VALIDATED/PUBLISHED prompts in riha-version-control-hub &amp; scan live market stream
          </p>
        </div>
        <button
          onClick={loadAll}
          className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          SYNC LIVE STREAM
        </button>
      </div>

      <ProblemDetailBanner problem={problem} onDismiss={() => setProblem(null)} />

      {/* Strategy Control Cards */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-zinc-300" />
          Versioned Strategy Prompt Bindings (riha-version-control-hub)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <div key={s.strategyId} className="onyx-glass rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                    {s.strategyId}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                    {s.lifecycleStatus}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{s.strategyName}</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{s.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>VCH PROMPT ARTIFACT:</span>
                  <span className="text-zinc-100">{s.promptName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={versionInputs[s.strategyId] || s.boundSemanticVersion}
                    onChange={(e) =>
                      setVersionInputs((prev) => ({
                        ...prev,
                        [s.strategyId]: e.target.value,
                      }))
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-white w-full"
                  />
                  <button
                    onClick={() => handleBindVersion(s)}
                    className="px-3 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shrink-0"
                  >
                    BIND SEMVER
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Watchlist Scanner */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
          Live Market Watchlist Stream (riha-stock-ai-market-ingestor)
        </h2>
        <div className="onyx-glass rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-mono uppercase text-zinc-400">
                <th className="py-3 px-4">Ticker</th>
                <th className="py-3 px-4">Live Price</th>
                <th className="py-3 px-4">VWAP</th>
                <th className="py-3 px-4">RSI-14</th>
                <th className="py-3 px-4">Rel Volume</th>
                <th className="py-3 px-4">Short Borrow Fee</th>
                <th className="py-3 px-4">Signal</th>
                <th className="py-3 px-4 text-right">Immediate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs font-mono">
              {watchlist.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-500">
                    No live market ticks in stream cache (503 Service Unavailable - Live Market Feed Disconnected). Configure RIHA_MARKET_WS_URL and RIHA_MARKET_API_KEY on riha-stock-ai-market-ingestor.
                  </td>
                </tr>
              ) : (
                watchlist.map((q) => (
                  <tr key={q.ticker} className="hover:bg-zinc-900/70">
                    <td className="py-3 px-4 font-bold text-white">{q.ticker}</td>
                    <td className="py-3 px-4 text-zinc-100">${q.lastPrice}</td>
                    <td className="py-3 px-4 text-zinc-300">${q.vwap}</td>
                    <td className="py-3 px-4 text-zinc-300">{q.rsi14}</td>
                    <td className="py-3 px-4 text-zinc-300">{q.relativeVolume}x</td>
                    <td className="py-3 px-4 text-zinc-300">{q.shortBorrowFeeRate}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200">
                        {q.strategySignalDetected}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleTriggerEvaluation(q.ticker)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold"
                      >
                        <Play className="w-3 h-3" />
                        Trigger Immediate AI Evaluation
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DecisionXRayDrawer
        decision={inspectedDecision}
        onClose={() => setInspectedDecision(null)}
      />
    </div>
  );
};

