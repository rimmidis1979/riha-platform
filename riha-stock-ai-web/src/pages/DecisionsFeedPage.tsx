import React, { useEffect, useState } from 'react';
import { Radio, RefreshCw, Search, Eye, Zap } from 'lucide-react';
import {
  fetchDecisions,
  ProblemDetailError,
  STRATEGY_API_BASE,
  triggerImmediateEvaluation,
} from '../api/stockAiClient';
import { AiTradeDecision, Rfc7807ProblemDetail } from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';
import { DecisionXRayDrawer } from '../components/DecisionXRayDrawer';

export const DecisionsFeedPage: React.FC = () => {
  const [decisions, setDecisions] = useState<AiTradeDecision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<AiTradeDecision | null>(null);
  const [tickerFilter, setTickerFilter] = useState('');
  const [evalTicker, setEvalTicker] = useState('NVDA');
  const [sseConnected, setSseConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);

  const loadDecisions = async (filter?: string) => {
    setLoading(true);
    try {
      const data = await fetchDecisions(filter);
      setDecisions(data);
      setProblem(null);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions();

    const streamUrl = `${STRATEGY_API_BASE}/api/v1/stock-ai/stream/decisions`;
    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('connected', () => {
      setSseConnected(true);
    });

    eventSource.addEventListener('decision', (event) => {
      try {
        const incoming: AiTradeDecision = JSON.parse((event as MessageEvent).data);
        setDecisions((prev) => [
          incoming,
          ...prev.filter((d) => d.decisionId !== incoming.decisionId),
        ]);
      } catch {
        // Ignore malformed SSE event
      }
    });

    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalTicker.trim()) return;
    setLoading(true);
    try {
      const created = await triggerImmediateEvaluation(evalTicker.trim().toUpperCase());
      setDecisions((prev) => [
        created,
        ...prev.filter((d) => d.decisionId !== created.decisionId),
      ]);
      setSelectedDecision(created);
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
    <div>
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Live AI Decision &amp; Transaction Feed
            </h1>
            <span
              className={`px-2 py-0.5 text-[11px] font-mono rounded border flex items-center gap-1.5 ${
                sseConnected
                  ? 'bg-zinc-900 border-emerald-700/60 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              <Radio className="w-3 h-3" />
              {sseConnected ? 'SSE STREAM LIVE' : 'SSE DISCONNECTED'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            PostgreSQL Ledger (ai_trade_decisions) • Click any transaction row to open the 5-Node DAG X-Ray Drawer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleEvaluate} className="flex items-center gap-2">
            <input
              type="text"
              value={evalTicker}
              onChange={(e) => setEvalTicker(e.target.value.toUpperCase())}
              placeholder="TICKER (e.g. NVDA)"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-white w-36 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-mono text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              EVALUATE LIVE DAG
            </button>
          </form>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />
            <input
              type="text"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDecisions(tickerFilter)}
              placeholder="Filter ticker..."
              className="bg-transparent text-xs font-mono text-zinc-200 focus:outline-none w-28"
            />
          </div>

          <button
            onClick={() => loadDecisions(tickerFilter)}
            className="p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300"
            title="Refresh ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <ProblemDetailBanner problem={problem} onDismiss={() => setProblem(null)} />

      {/* Streaming Transactions Table */}
      <div className="onyx-glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/90 bg-zinc-900/60 text-[11px] font-mono uppercase text-zinc-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Ticker</th>
                <th className="py-3 px-4">Strategy &amp; Prompt Version</th>
                <th className="py-3 px-4">Critic SpEL</th>
                <th className="py-3 px-4">Semantic Score</th>
                <th className="py-3 px-4">Final Action</th>
                <th className="py-3 px-4">Robinhood Order</th>
                <th className="py-3 px-4 text-right">X-Ray</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs font-mono">
              {decisions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    Zero persisted AI trade decisions in live ledger. Trigger an evaluation or connect live Kafka market feed (riha.stockai.market.ticks.live).
                  </td>
                </tr>
              ) : (
                decisions.map((d) => (
                  <tr
                    key={d.decisionId}
                    onClick={() => setSelectedDecision(d)}
                    className="hover:bg-zinc-900/70 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {new Date(d.decidedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{d.ticker}</td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-200">{d.strategyName}</div>
                      <div className="text-[11px] text-zinc-500">{d.promptVersionUsed}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] border ${
                          d.criticSpelPassed
                            ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                            : 'bg-red-950/50 border-red-800 text-red-300'
                        }`}
                      >
                        {d.criticSpelPassed ? 'SPEL PASS' : 'SPEL BLOCKED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-200">
                      {(d.criticSemanticScore * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-100">
                        {d.finalAction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {d.brokerageOrderId
                        ? `${d.brokerageOrderId} (${d.quantity} @ $${d.executedPrice})`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200">
                        <Eye className="w-3.5 h-3.5" />
                        X-RAY
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DecisionXRayDrawer
        decision={selectedDecision}
        onClose={() => setSelectedDecision(null)}
      />
    </div>
  );
};

