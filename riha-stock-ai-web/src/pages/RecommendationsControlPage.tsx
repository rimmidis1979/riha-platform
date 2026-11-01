import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Play,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  executeOneClickRecommendation,
  fetchMasterAuditSummary,
  ProblemDetailError,
  runTopStocksBatchScan,
  updateAutoTradeMode,
} from '../api/stockAiClient';
import {
  AiTradeAuditTrail,
  MasterAuditSummary,
  Rfc7807ProblemDetail,
} from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';

export const RecommendationsControlPage: React.FC = () => {
  const [summary, setSummary] = useState<MasterAuditSummary | null>(null);
  const [filterAction, setFilterAction] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [toggling, setToggling] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);

  const loadRecommendations = useCallback(async () => {
    try {
      setProblem(null);
      const data = await fetchMasterAuditSummary('ALL');
      setSummary(data);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleToggleAutoMode = async () => {
    if (!summary) return;
    setToggling(true);
    try {
      const next = !summary.autoTradeEnabled;
      await updateAutoTradeMode(next);
      await loadRecommendations();
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setToggling(false);
    }
  };

  const handleOneClickExecute = async (auditId: string) => {
    setExecutingId(auditId);
    try {
      await executeOneClickRecommendation(auditId);
      await loadRecommendations();
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setExecutingId(null);
    }
  };

  const handleTriggerFreshScan = async () => {
    setScanning(true);
    try {
      await runTopStocksBatchScan('1D');
      await loadRecommendations();
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setScanning(false);
    }
  };

  const recommendations: AiTradeAuditTrail[] = (summary?.auditTrail || []).filter((item) => {
    if (filterAction === 'BUY') return item.aiRecommendation === 'BUY';
    if (filterAction === 'SELL') return item.aiRecommendation === 'SELL';
    return item.aiRecommendation === 'BUY' || item.aiRecommendation === 'SELL';
  });

  return (
    <div className="space-y-6">
      {/* Master Autonomous Execution Control Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              AI Recommendation &amp; Autonomous Buy/Sell Execution Control Bar
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Switch between FULL_AUTO_MCP_EXECUTION (auto-dispatches Critic-approved orders to Robinhood MCP) and RECOMMEND_ONLY (one-click operator approval).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleAutoMode}
            disabled={toggling}
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-2.5 transition ${
              summary?.autoTradeEnabled
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-amber-950/80 border-amber-500 text-amber-200'
            }`}
          >
            {summary?.autoTradeEnabled ? (
              <ToggleRight className="w-5 h-5 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-amber-400" />
            )}
            <span>
              Autonomous Buy/Sell Execution:{' '}
              <strong>{summary?.autoTradeMode || 'FULL_AUTO_MCP_EXECUTION'}</strong>
            </span>
          </button>

          <button
            onClick={handleTriggerFreshScan}
            disabled={scanning}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-semibold text-xs flex items-center gap-1.5 transition"
          >
            {scanning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Generate Live Recommendations
          </button>
        </div>
      </div>

      {problem && <ProblemDetailBanner problem={problem} onRetry={loadRecommendations} />}

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 text-xs font-mono">
          {(['ALL', 'BUY', 'SELL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterAction(tab)}
              className={`px-3.5 py-1.5 rounded-md transition ${
                filterAction === tab
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'ALL' ? `All Signals (${recommendations.length})` : `${tab} Signals`}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-zinc-400">
          Contract: RIHA_STOCK_AI_TRADE_CONTRACT_V1
        </span>
      </div>

      {/* Structured Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const isBuy = rec.aiRecommendation === 'BUY';
          const canOneClickExecute =
            rec.criticSpelVerdict === 'APPROVED' &&
            rec.executionStatus === 'RECOMMENDED_AWAITING_ONE_CLICK_APPROVAL';

          return (
            <div
              key={rec.auditId}
              className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-bold font-mono text-white px-2.5 py-1 rounded bg-zinc-950 border border-zinc-700">
                      {rec.ticker}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 border ${
                        isBuy
                          ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                          : 'bg-rose-950/90 border-rose-500/70 text-rose-300'
                      }`}
                    >
                      {isBuy ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {rec.aiRecommendation} ({rec.quantity} shares)
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                      {rec.timeWindow} Window
                    </span>
                  </div>

                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {(Number(rec.criticConvergenceScore) * 100).toFixed(1)}% Critic
                  </span>
                </div>

                {/* Price Targets Grid */}
                <div className="grid grid-cols-3 gap-2.5 bg-zinc-950/90 border border-zinc-800/80 rounded-lg p-3 text-xs font-mono">
                  <div>
                    <div className="text-zinc-500 text-[10px]">LIMIT ENTRY</div>
                    <div className="text-white font-bold text-sm">
                      ${Number(rec.limitPrice).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px]">STOP LOSS</div>
                    <div className="text-rose-400 font-bold text-sm">
                      ${Number(rec.stopLossPrice).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px]">TAKE PROFIT</div>
                    <div className="text-emerald-400 font-bold text-sm">
                      ${Number(rec.takeProfitPrice).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-950/50 border border-zinc-800/60 rounded-lg p-3">
                  {rec.aiReasoningSummary}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-zinc-400 text-[11px]">
                    Strategy: <strong className="text-zinc-200">{rec.strategyApplied}</strong>
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    Prompt: {rec.promptVersion} • Status: {rec.executionStatus}
                  </span>
                </div>

                {canOneClickExecute ? (
                  <button
                    onClick={() => handleOneClickExecute(rec.auditId)}
                    disabled={executingId === rec.auditId}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold flex items-center gap-1.5 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {executingId === rec.auditId ? 'Executing...' : 'One-Click Execute'}
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {rec.robinhoodOrderId || rec.executionStatus}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

