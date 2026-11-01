import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { OwnedStockPosition, OrderTicketParams, PersonalizedAccountSummary } from '../types/stockAi';
import {
  fetchOwnedPositions,
  fetchPersonalizedAccountSummary,
  triggerAnalyzeStockNow,
} from '../api/stockAiClient';
import { PersonalizedAccountRibbon } from '../components/dashboard/PersonalizedAccountRibbon';
import { OwnedStocksTable } from '../components/dashboard/OwnedStocksTable';
import { OrderTicketModal } from '../components/modals/OrderTicketModal';
import { StockChartDrawer } from '../components/drawers/StockChartDrawer';
import { AdvancedStrategyModal } from '../components/modals/AdvancedStrategyModal';
import { SmartBracketModal } from '../components/modals/SmartBracketModal';
import { CostBasisCalculatorModal } from '../components/modals/CostBasisCalculatorModal';
import { PositionHistoryModal } from '../components/modals/PositionHistoryModal';

interface Props {
  onNavigate: (route: string) => void;
}

export const PersonalizedDashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<PersonalizedAccountSummary | null>(null);
  const [positions, setPositions] = useState<OwnedStockPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [ticketParams, setTicketParams] = useState<OrderTicketParams | null>(null);
  const [chartTicker, setChartTicker] = useState<string | null>(null);
  const [strategyTicker, setStrategyTicker] = useState<string | null>(null);
  const [bracketParams, setBracketParams] = useState<{
    ticker: string;
    price: number;
    sl: number;
    tp: number;
  } | null>(null);
  const [costBasisParams, setCostBasisParams] = useState<{
    ticker: string;
    qty: number;
    avgCost: number;
    price: number;
  } | null>(null);
  const [historyTicker, setHistoryTicker] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sum, pos] = await Promise.all([
        fetchPersonalizedAccountSummary(),
        fetchOwnedPositions(),
      ]);
      setSummary(sum);
      setPositions(pos);
    } catch (err) {
      console.error('Failed to load portfolio dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleReAnalyze = async (ticker: string) => {
    try {
      await triggerAnalyzeStockNow(ticker);
      loadData();
    } catch (err: any) {
      alert(`Re-analysis failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-white">
            Tab 1: My Personalized Portfolio &amp; Owned Stocks Workstation
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Institutional Onyx Execution Desk • Zero Mock Policy • Strict Position-Gated Sell Protection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync Live Desk</span>
          </button>
        </div>
      </div>

      {/* Account Telemetry Ribbon */}
      <PersonalizedAccountRibbon summary={summary} loading={loading} onRefresh={loadData} />

      {/* Master Owned Stocks Table */}
      <OwnedStocksTable
        positions={positions}
        loading={loading}
        onOpenOrderTicket={(ticker, side, type, price, tp, sl, ownedQty) => {
          setTicketParams({
            ticker,
            initialSide: side,
            initialType: type,
            price,
            targetPrice: tp,
            stopLossPrice: sl,
            ownedQuantity: ownedQty,
          });
        }}
        onOpenChart={(ticker) => setChartTicker(ticker)}
        onOpenStrategy={(ticker) => setStrategyTicker(ticker)}
        onOpenBracket={(ticker, price, sl, tp) => setBracketParams({ ticker, price, sl, tp })}
        onOpenCostBasis={(ticker, qty, avgCost, price) => setCostBasisParams({ ticker, qty, avgCost, price })}
        onReAnalyze={handleReAnalyze}
        onOpenHistory={(ticker) => setHistoryTicker(ticker)}
        onNavigateToReview={onNavigate}
      />

      {/* Modals & Drawers */}
      {ticketParams && (
        <OrderTicketModal
          params={ticketParams}
          onClose={() => setTicketParams(null)}
          onSuccess={loadData}
        />
      )}

      {chartTicker && (
        <StockChartDrawer
          ticker={chartTicker}
          onClose={() => setChartTicker(null)}
          onOpenOrderTicket={(side) => {
            const pos = positions.find((p) => p.ticker === chartTicker);
            setTicketParams({
              ticker: chartTicker,
              initialSide: side,
              price: pos?.liveMarketPrice || 100,
              targetPrice: pos?.predictedTargetPrice,
              stopLossPrice: pos?.stopLossPrice,
              ownedQuantity: pos?.ownedQuantity || 0,
            });
          }}
        />
      )}

      {strategyTicker && (
        <AdvancedStrategyModal ticker={strategyTicker} onClose={() => setStrategyTicker(null)} />
      )}

      {bracketParams && (
        <SmartBracketModal
          ticker={bracketParams.ticker}
          currentPrice={bracketParams.price}
          initialStopLoss={bracketParams.sl}
          initialTarget={bracketParams.tp}
          onClose={() => setBracketParams(null)}
          onSave={() => loadData()}
        />
      )}

      {costBasisParams && (
        <CostBasisCalculatorModal
          ticker={costBasisParams.ticker}
          ownedQuantity={costBasisParams.qty}
          averageCostPrice={costBasisParams.avgCost}
          liveMarketPrice={costBasisParams.price}
          onClose={() => setCostBasisParams(null)}
        />
      )}

      {historyTicker && (
        <PositionHistoryModal ticker={historyTicker} onClose={() => setHistoryTicker(null)} />
      )}
    </div>
  );
};

