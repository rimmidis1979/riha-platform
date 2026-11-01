import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  fetchMasterAuditSummary,
  fetchTopMoversDirect,
  ProblemDetailError,
  runTopStocksBatchScan,
  STRATEGY_API_BASE,
} from '../api/stockAiClient';
import {
  AiTradeAuditTrail,
  LiveWatchlistQuote,
  Rfc7807ProblemDetail,
} from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';

const DAG_NODES = [
  { id: 'NODE_1_TECHNICAL_SCAN', label: '1. Scanning Technicals', sub: 'VWAP • RSI-14 • RVOL • L2' },
  { id: 'NODE_2_SEC_CATALYST_SCAN', label: '2. Checking SEC / Memory', sub: 'EDGAR 8-K/S-3 • pgvector' },
  { id: 'NODE_3_STRATEGY_SYNTHESIS', label: '3. Applying Strategy', sub: 'VCH Prompt • Schema Gate' },
  { id: 'NODE_4_CRITIC_REVIEW', label: '4. Critic Review', sub: '4 SpEL Rules • Convergence' },
  { id: 'NODE_5_AUTO_EXECUTION', label: '5. Auto Buy/Sell Decision', sub: 'Robinhood MCP Execution' },
];

export const TopMoversScannerPage: React.FC = () => {
  const [windowMode, setWindowMode] = useState<'1D' | '1H'>('1D');
  const [topMovers, setTopMovers] = useState<LiveWatchlistQuote[]>([]);
  const [auditsByTicker, setAuditsByTicker] = useState<Record<string, AiTradeAuditTrail>>({});
  const [liveNodeEvents, setLiveNodeEvents] = useState<Record<string, { nodeId: string; status: string; detail: string }>>({});
  const [scanning, setScanning] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);

  const loadScannerData = useCallback(async (targetWindow: '1D' | '1H') => {
    try {
      setProblem(null);
      const [movers, summary] = await Promise.all([
        fetchTopMoversDirect(targetWindow),
        fetchMasterAuditSummary(targetWindow),
      ]);
      setTopMovers(movers);
      const map: Record<string, AiTradeAuditTrail> = {};
      for (const item of summary.auditTrail) {
        if (!map[item.ticker]) {
          map[item.ticker] = item;
        }
      }
      setAuditsByTicker(map);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  }, []);

  useEffect(() => {
    loadScannerData(windowMode);
  }, [windowMode, loadScannerData]);

  useEffect(() => {
    const es = new EventSource(`${STRATEGY_API_BASE}/api/v1/stock-ai/stream/live-audit`);
    es.addEventListener('connected', () => setSseConnected(true));
    es.addEventListener('dag_node_progress', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        if (data && data.ticker) {
          setLiveNodeEvents((prev) => ({
            ...prev,
            [data.ticker]: {
              nodeId: data.nodeId,
              status: data.status,
              detail: data.detail,
            },
          }));
        }
      } catch {
        // ignore parse error
      }
    });
    es.addEventListener('stock_audit_completed', (evt: MessageEvent) => {
      try {
        const audit: AiTradeAuditTrail = JSON.parse(evt.data);
        setAuditsByTicker((prev) => ({ ...prev, [audit.ticker]: audit }));
      } catch {
        // ignore
      }
    });
    es.onerror = () => setSseConnected(false);
    return () => es.close();
  }, []);

  const handleRunScan = async () => {
    setScanning(true);
    setProblem(null);
    try {
      const res = await runTopStocksBatchScan(windowMode);
      const nextMap: Record<string, AiTradeAuditTrail> = { ...auditsByTicker };
      for (const item of res.results) {
        nextMap[item.ticker] = item;
      }
      setAuditsByTicker(nextMap);
      await loadScannerData(windowMode);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Top Movers Scanner &amp; On-The-Fly 5-Node Agentic DAG Matrix
            </h1>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                sseConnected
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
              }`}
            >
              {sseConnected ? 'SSE /stream/live-audit LIVE' : 'SSE CONNECTING'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Step 1: Fetch Top Movers via @McpTool(&quot;fetchTopMoversByWindow&quot;) &rarr; Step 2: Parallel 5-Node DAG Orchestration &rarr; Step 3: Critic Gate &amp; Auto Execution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-1 text-xs font-mono">
            <button
              onClick={() => setWindowMode('1D')}
              className={`px-3 py-1.5 rounded-md transition ${
                windowMode === '1D'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Top Stocks of the Day (1D)
            </button>
            <button
              onClick={() => setWindowMode('1H')}
              className={`px-3 py-1.5 rounded-md transition ${
                windowMode === '1H'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Top Stocks of the Hour (1H)
            </button>
          </div>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs font-mono flex items-center gap-2 transition"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Running {windowMode} Multi-Stock DAG...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run On-The-Fly {windowMode} Strategy Scan
              </>
            )}
          </button>
        </div>
      </div>

      {problem && <ProblemDetailBanner problem={problem} onRetry={() => loadScannerData(windowMode)} />}

      {/* 5-Node DAG Progress Matrix */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
            Live Multi-Stock 5-Node Agentic DAG Execution Matrix ({windowMode} Window • {topMovers.length} Active Movers)
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Source: LIVE_YAHOO_FINANCE_CHART_STREAM + SEC EDGAR + RIHA Critic Engine
          </span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {topMovers.map((mover) => {
            const audit = auditsByTicker[mover.ticker];
            const liveEvt = liveNodeEvents[mover.ticker];
            let timings: Record<string, number> = {};
            if (audit?.dagNodeTimingsMsJson) {
              try {
                timings = JSON.parse(audit.dagNodeTimingsMsJson);
              } catch {
                timings = {};
              }
            }

            return (
              <div key={mover.ticker} className="p-4 hover:bg-zinc-900/60 transition space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold font-mono text-white px-2.5 py-1 rounded bg-zinc-950 border border-zinc-700">
                      {mover.ticker}
                    </span>
                    <div className="text-xs font-mono">
                      <span className="text-zinc-100 font-semibold">${Number(mover.lastPrice).toFixed(2)}</span>
                      <span className="text-zinc-500 mx-1.5">|</span>
                      <span className="text-zinc-400">VWAP ${Number(mover.vwap).toFixed(2)}</span>
                      <span className="text-zinc-500 mx-1.5">|</span>
                      <span className="text-zinc-400">RSI {Number(mover.rsi14).toFixed(1)}</span>
                      <span className="text-zinc-500 mx-1.5">|</span>
                      <span className="text-emerald-400">RVOL {Number(mover.relativeVolume).toFixed(2)}x</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    {audit ? (
                      <>
                        <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                          {audit.strategyApplied} ({audit.promptVersion})
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded font-semibold border ${
                            audit.aiRecommendation === 'BUY'
                              ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                              : audit.aiRecommendation === 'SELL'
                              ? 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          }`}
                        >
                          AI: {audit.aiRecommendation}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded font-semibold border flex items-center gap-1 ${
                            audit.executionStatus.startsWith('AUTO_EXECUTED')
                              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                              : audit.executionStatus === 'RECOMMENDED_AWAITING_ONE_CLICK_APPROVAL'
                              ? 'bg-amber-950/80 border-amber-600/60 text-amber-200'
                              : audit.executionStatus === 'BLOCKED_BY_CRITIC'
                              ? 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {audit.executionStatus}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Ready for On-The-Fly DAG Scan
                      </span>
                    )}
                  </div>
                </div>

                {/* 5 DAG Node Pipeline Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {DAG_NODES.map((node) => {
                    const completed = Boolean(audit);
                    const isCriticBlocked =
                      node.id === 'NODE_4_CRITIC_REVIEW' &&
                      audit &&
                      audit.criticSpelVerdict !== 'APPROVED';
                    const isRunning = liveEvt?.nodeId === node.id && liveEvt?.status === 'RUNNING';
                    const durationMs = timings[node.id];

                    return (
                      <div
                        key={node.id}
                        className={`rounded-lg p-2.5 border text-xs font-mono transition ${
                          isRunning
                            ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                            : isCriticBlocked
                            ? 'bg-rose-950/40 border-rose-700/70 text-rose-200'
                            : completed
                            ? 'bg-zinc-950/90 border-emerald-800/60 text-zinc-200'
                            : 'bg-zinc-950/50 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{node.label}</span>
                          {isCriticBlocked ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Activity className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center justify-between">
                          <span>{node.sub}</span>
                          {durationMs !== undefined && (
                            <span className="text-emerald-400">{durationMs}ms</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {audit && (
                  <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/70 border border-zinc-800/80 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="truncate max-w-4xl">{audit.aiReasoningSummary}</span>
                    <span className="text-zinc-300 shrink-0 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Critic Score: {(Number(audit.criticConvergenceScore) * 100).toFixed(1)}%
                      {audit.robinhoodOrderId && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Order: {audit.robinhoodOrderId}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

