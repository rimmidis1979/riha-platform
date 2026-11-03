import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { OrderSide } from '../../types/trading';
import { History, Download, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { getStockName, TickerHoverLabel } from '../../utils/stockNames';

interface TradeHistoryTableProps {
  brokerFilter?: 'ALL' | 'ROBINHOOD' | 'CHARLES_SCHWAB';
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ brokerFilter = 'ALL' }) => {
  const { tradeHistory } = useTrading();
  const [filterSide, setFilterSide] = useState<'ALL' | OrderSide>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTUAL' | 'PAPERLESS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = tradeHistory.filter((item) => {
    const matchesSide = filterSide === 'ALL' || item.side === filterSide;
    const matchesBroker =
      brokerFilter === 'ALL' ||
      (brokerFilter === 'ROBINHOOD' && (!item.broker || item.broker === 'ROBINHOOD')) ||
      (brokerFilter === 'CHARLES_SCHWAB' && item.broker === 'CHARLES_SCHWAB');
    const matchesMode = filterMode === 'ALL' || (item.executionMode || 'ACTUAL') === filterMode;
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSide && matchesBroker && matchesMode && matchesSearch;
  });

  const exportCsv = () => {
    const headers = 'Order ID,Timestamp,Side,Symbol,Company,Shares,Price,Total Value,Order Type,Status\n';
    const rows = filteredHistory
      .map(
        (t) =>
          `"${t.id}","${t.timestamp}","${t.side}","${t.symbol}","${t.companyName || t.symbol}",${t.shares},${t.executionPrice},${t.totalValue},"${t.orderType}","${t.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riha-stock-trading-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Stock Purchase &amp; Order History ({filteredHistory.length} Executions)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Immutable audit ledger of executed stock purchases and sales</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Side Filter Toggle */}
          <div className="flex items-center bg-[#0b0f19] p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterSide === side
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {side}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            disabled={filteredHistory.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="font-semibold text-slate-300">No trade history recorded yet</p>
          <p className="mt-0.5">Executed buy and sell orders will appear here in chronological sequence.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#161d2d] text-[11px] font-mono uppercase text-slate-400">
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold text-center">Broker</th>
                <th className="py-3 px-4 font-semibold text-center">Mode</th>
                <th className="py-3 px-4 font-semibold text-center">Type / Side</th>
                <th className="py-3 px-4 font-semibold">Asset / Symbol</th>
                <th className="py-3 px-4 font-semibold text-right">Shares</th>
                <th className="py-3 px-4 font-semibold text-right">Exec Price</th>
                <th className="py-3 px-4 font-semibold text-right">Total Value</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
              {filteredHistory.map((item) => {
                const isBuy = item.side === 'BUY';
                const isSchwab = item.broker === 'CHARLES_SCHWAB';
                const isPaper = item.executionMode === 'PAPERLESS';

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {item.id}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {item.timestamp}
                    </td>

                    {/* Broker Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSchwab
                            ? 'bg-sky-950/70 text-sky-300 border border-sky-800/60'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {isSchwab ? 'Schwab' : 'Robinhood'}
                      </span>
                    </td>

                    {/* Execution Mode */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPaper
                            ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/60'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {isPaper ? 'Paperless' : 'Actual'}
                      </span>
                    </td>

                    {/* Side (BUY / SELL) */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          isBuy
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {item.side}
                      </span>
                    </td>

                    {/* Symbol */}
                    <td className="py-3.5 px-4">
                      <TickerHoverLabel
                        ticker={item.symbol}
                        name={item.companyName}
                        badgeClassName="font-mono font-bold text-slate-100"
                      />
                      <div
                        title={getStockName(item.symbol, item.companyName)}
                        className="text-xs text-slate-400 truncate max-w-[140px] font-sans cursor-pointer hover:text-slate-200"
                      >
                        {getStockName(item.symbol, item.companyName)}
                      </div>
                    </td>

                    {/* Shares */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200 tabular-nums">
                      {item.shares.toLocaleString()}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300 tabular-nums">
                      ${item.executionPrice.toFixed(2)}
                    </td>

                    {/* Total Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 tabular-nums">
                      ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>FILLED</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
