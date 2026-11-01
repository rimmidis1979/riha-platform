import React from 'react';
import { X, GitBranch, Activity, Cpu, ShieldCheck, ShieldX, Receipt } from 'lucide-react';
import { AiTradeDecision } from '../types/stockAi';

interface Props {
  decision: AiTradeDecision | null;
  onClose: () => void;
}

export const DecisionXRayDrawer: React.FC<Props> = ({ decision, onClose }) => {
  if (!decision) return null;

  let marketSnapshot: Record<string, unknown> = {};
  let reasoningData: Record<string, unknown> = {};

  try {
    marketSnapshot = JSON.parse(decision.liveMarketSnapshotJson || '{}');
  } catch {
    marketSnapshot = {};
  }

  try {
    reasoningData = JSON.parse(decision.agentReasoningJson || '{}');
  } catch {
    reasoningData = {};
  }

  const lineage = (reasoningData.strategyPromptLineage as Record<string, unknown>) || {};
  const dagNodes = (reasoningData.dagNodes as Array<Record<string, unknown>>) || [];

  const node4 = dagNodes.find((n) => n.nodeId === 'CRITIC_RISK_AND_GUARDRAIL_GATE');
  const criticVerdict = (node4?.criticVerdict as Record<string, unknown>) || {};
  const spelRules = (criticVerdict.spelRuleBreakdown as Array<Record<string, unknown>>) || [];

  const node5 = dagNodes.find((n) => n.nodeId === 'ROBINHOOD_MCP_EXECUTION');
  const executionReceipt = (node5?.executionReceipt as Record<string, unknown>) || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto p-6 text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                AI DECISION X-RAY INSPECTOR
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {decision.decisionId}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-1 flex items-center gap-3">
              <span>{decision.ticker}</span>
              <span className="text-sm font-mono px-2.5 py-0.5 rounded border border-zinc-700 bg-zinc-900">
                {decision.finalAction}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 mt-6">
          {/* 1. Strategy & Prompt Lineage */}
          <section className="onyx-glass rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
              <GitBranch className="w-4 h-4 text-zinc-300" />
              1. Strategy &amp; Prompt Lineage (riha-version-control-hub)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">STRATEGY NAME</span>
                <span className="text-zinc-100 font-semibold">{decision.strategyName}</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">PROMPT VERSION</span>
                <span className="text-zinc-100 font-semibold">{decision.promptVersionUsed}</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">WORKFLOW DAG ID</span>
                <span className="text-zinc-100">{decision.workflowInstanceId}</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">GOAL CONTRACT</span>
                <span className="text-zinc-200">{String(reasoningData.goalContractId || 'RIHA_STOCK_AI_TRADE_CONTRACT_V1')}</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">TOPOLOGY GRAPH</span>
                <span className="text-zinc-200">{String(reasoningData.topologyId || 'RIHA_STOCK_AI_STRATEGY_DAG_V1')}</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">SEMVER ARTIFACT</span>
                <span className="text-zinc-200">{String(lineage.semanticVersion || 'v1.0.0')}</span>
              </div>
            </div>
          </section>

          {/* 2. Live Market Input Snapshot */}
          <section className="onyx-glass rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
              <Activity className="w-4 h-4 text-zinc-300" />
              2. Live Market Input Snapshot (Millisecond of Evaluation)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">LIVE PRICE</span>
                <span className="text-sm font-bold text-white">
                  ${String(marketSnapshot.lastPrice ?? 'N/A')}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">VWAP</span>
                <span className="text-sm font-bold text-zinc-200">
                  ${String(marketSnapshot.vwap ?? 'N/A')}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">RSI-14</span>
                <span className="text-sm font-bold text-zinc-200">
                  {String(marketSnapshot.rsi14 ?? 'N/A')}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">REL VOLUME</span>
                <span className="text-sm font-bold text-zinc-200">
                  {String(marketSnapshot.relativeVolume ?? 'N/A')}x
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">SPREAD (BPS)</span>
                <span className="text-sm font-bold text-zinc-200">
                  {String(marketSnapshot.spreadBps ?? 'N/A')} bps
                </span>
              </div>
            </div>
          </section>

          {/* 3. Multi-Agent Reasoning Chain */}
          <section className="onyx-glass rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
              <Cpu className="w-4 h-4 text-zinc-300" />
              3. Multi-Agent DAG Reasoning Chain (5-Node DYNAMIC_DAG)
            </div>
            <div className="space-y-2.5">
              {dagNodes.map((node, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/90 border border-zinc-800 rounded p-3 text-xs font-mono"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-zinc-100">
                      Node {String(node.sequence || idx + 1)}: {String(node.nodeId)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {String(node.status)}
                    </span>
                  </div>
                  <pre className="text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-40">
                    {JSON.stringify(
                      node.output || node.tradeContractPayload || node.criticVerdict || node.executionReceipt,
                      null,
                      2
                    )}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Critic & Risk Gate Verdict */}
          <section className="onyx-glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                {decision.criticSpelPassed ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldX className="w-4 h-4 text-red-400" />
                )}
                4. Critic &amp; Deterministic SpEL Risk Gate Verdict
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900">
                Semantic Convergence: {(decision.criticSemanticScore * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-300 bg-zinc-900/90 p-3 rounded border border-zinc-800 mb-3">
              {decision.criticFeedback}
            </p>
            {spelRules.length > 0 && (
              <div className="space-y-1.5">
                {spelRules.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs font-mono bg-zinc-900/60 px-3 py-1.5 rounded border border-zinc-800/80"
                  >
                    <span className="text-zinc-300 truncate pr-4">{String(r.expression)}</span>
                    <span
                      className={
                        r.passed
                          ? 'text-emerald-400 font-semibold shrink-0'
                          : 'text-red-400 font-semibold shrink-0'
                      }
                    >
                      {r.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. Robinhood Execution Receipt */}
          <section className="onyx-glass rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
              <Receipt className="w-4 h-4 text-zinc-300" />
              5. Robinhood Brokerage Execution Receipt (riha-stock-ai-robinhood-mcp-server)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">BROKERAGE ORDER ID</span>
                <span className="text-zinc-100">{decision.brokerageOrderId || 'NOT_DISPATCHED'}</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">FILL STATUS</span>
                <span className="text-zinc-100">
                  {String(executionReceipt.fillStatus || executionReceipt.executionStatus || decision.finalAction)}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">AVG FILL PRICE</span>
                <span className="text-zinc-100">
                  {decision.executedPrice ? `$${decision.executedPrice}` : 'N/A'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800">
                <span className="text-zinc-500 block">QUANTITY</span>
                <span className="text-zinc-100">{decision.quantity ?? 0} shares</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

