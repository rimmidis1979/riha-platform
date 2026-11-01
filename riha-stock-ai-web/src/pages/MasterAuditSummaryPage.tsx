import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Coins,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  fetchMasterAuditSummary,
  ProblemDetailError,
} from '../api/stockAiClient';
import {
  MasterAuditSummary,
  Rfc7807ProblemDetail,
} from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';

export const MasterAuditSummaryPage: React.FC = () => {
  const [summary, setSummary] = useState<MasterAuditSummary | null>(null);
  const [windowFilter, setWindowFilter] = useState<'ALL' | '1D' | '1H'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);

  const loadSummary = useCallback(async (win: string) => {
    try {
      setProblem(null);
      const data = await fetchMasterAuditSummary(win);
      setSummary(data);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  }, []);

  useEffect(() => {
    loadSummary(windowFilter);
  }, [windowFilter, loadSummary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Master Event Audit &amp; Batch Summary Ledger
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Immutable PostgreSQL audit trail (AiTradeAuditTrailEntity) + riha-eval-monitor (:8087) telemetry lineage for every scanned stock.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-1 text-xs font-mono">
            {(['ALL', '1D', '1H'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindowFilter(w)}
                className={`px-3 py-1.5 rounded-md transition ${
                  windowFilter === w
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {w === 'ALL' ? 'All Windows' : `${w} Window`}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadSummary(windowFilter)}
            className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {problem && <ProblemDetailBanner problem={problem} onRetry={() => loadSummary(windowFilter)} />}

      {/* Executive KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono">
          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">Total Scanned</div>
            <div className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-zinc-400" />
              {summary.totalStocksScanned}
            </div>
          </div>

          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">Total BUY Signals</div>
            <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {summary.totalBuySignals}
            </div>
          </div>

          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">Total SELL Signals</div>
            <div className="text-xl font-bold text-rose-400 mt-1 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              {summary.totalSellSignals}
            </div>
          </div>

          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">Critic Approved / Rejected</div>
            <div className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {summary.criticApprovals} / <span className="text-rose-400">{summary.criticRejections}</span>
            </div>
          </div>

          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">Auto-Executed Orders</div>
            <div className="text-xl font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              {summary.autoExecutedOrders}
            </div>
          </div>

          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">Session P&amp;L Edge</div>
            <div
              className={`text-xl font-bold mt-1 ${
                Number(summary.realizedUnrealizedPnlUsd) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${Number(summary.realizedUnrealizedPnlUsd).toFixed(2)}
            </div>
          </div>

          <div className="bg-zinc-900/85 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-[10px] text-zinc-400 uppercase">LLM Tokens &amp; Cost</div>
            <div className="text-sm font-bold text-zinc-100 mt-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {summary.totalTokensUsed.toLocaleString()} (${Number(summary.totalTokenCostUsd).toFixed(4)})
            </div>
          </div>
        </div>
      )}

      {/* Expandable Event Timeline */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-zinc-200 uppercase">
            Complete Event Audit Timeline (Click any row to inspect Kafka events, VCH prompt lineage &amp; MCP receipts)
          </span>
          <span className="text-zinc-400">
            telemetry.audit.completed &rarr; riha-eval-monitor (:8087)
          </span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {(summary?.auditTrail || []).map((row) => {
            const isExpanded = expandedId === row.auditId;
            return (
              <div key={row.auditId} className="p-4 space-y-3 hover:bg-zinc-900/60 transition">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : row.auditId)}
                  className="cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                      {row.timeWindow}
                    </span>
                    <span className="text-sm font-bold text-white px-2.5 py-0.5 rounded bg-zinc-950 border border-zinc-700">
                      {row.ticker}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        row.aiRecommendation === 'BUY'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : row.aiRecommendation === 'SELL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {row.aiRecommendation} @ ${Number(row.limitPrice).toFixed(2)}
                    </span>
                    <span className="text-zinc-300">{row.strategyApplied}</span>
                    <span className="text-zinc-500">({row.promptVersion})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold">{row.executionStatus}</span>
                    {row.robinhoodOrderId && (
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                        {row.robinhoodOrderId}
                      </span>
                    )}
                    <span className="text-zinc-500">
                      {row.totalTokensUsed} tok
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 text-xs font-mono space-y-2">
                    <div className="text-zinc-400">
                      Batch ID: <span className="text-zinc-200">{row.batchScanId}</span> | Workflow ID:{' '}
                      <span className="text-zinc-200">{row.workflowInstanceId}</span> | Decision ID:{' '}
                      <span className="text-zinc-200">{row.decisionId}</span>
                    </div>
                    <pre className="text-[11px] text-emerald-300/90 overflow-x-auto max-h-80">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(row.rawEventLineageJson), null, 2);
                        } catch {
                          return row.rawEventLineageJson;
                        }
                      })()}
                    </pre>
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

