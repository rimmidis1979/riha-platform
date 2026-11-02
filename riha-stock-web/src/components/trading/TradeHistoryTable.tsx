import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { TradeOrder, OrderSide } from '../../types/trading';
import { History, Download, Filter, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const TradeHistoryTable: React.FC = () => {
  const { tradeHistory } = useTrading();
  const [filterSide, setFilterSide] = useState<'ALL' | OrderSide>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = tradeHistory.filter((item) => {
    const matchesSide = filterSide === 'ALL' || item.side === filterSide;
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSide && matchesSearch;
  });

  const exportCsv = () => {
    const headers = 'Order ID,Timestamp,Side,Symbol,Company,Shares,Price,Total Value,Order Type,Status\n';
    const rows = filteredHistory
      .map(
        (t) =>
          `"${t.id}","${t.timestamp}","${t.side}","${t.symbol}","${t.companyName}",${t.shares},${t.executionPrice},${t.totalValue},"${t.orderType}","${t.status}"`
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
    <div className="onyx-card rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            Stock Purchase & Trading History ({filteredHistory.length} Executions)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Immutable audit ledger of all executed stock orders and fills</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Side Filter Toggle */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterSide === side
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {side}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <input
            type="text"
            placeholder="Search ticker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-32"
          />

          {/* Export CSV Button */}
          <button
            onClick={exportCsv}
            title="Download CSV Ledger"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] font-mono uppercase text-zinc-400">
              <th className="py-3.5 px-4 font-semibold">Date & Timestamp</th>
              <th className="py-3.5 px-4 font-semibold">Action</th>
              <th className="py-3.5 px-4 font-semibold">Stock / Asset</th>
              <th className="py-3.5 px-4 font-semibold text-right">Shares Filled</th>
              <th className="py-3.5 px-4 font-semibold text-right">Exec Price</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Amount</th>
              <th className="py-3.5 px-4 font-semibold text-center">Status</th>
              <th className="py-3.5 px-4 font-semibold text-right">Reference ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {filteredHistory.map((order: TradeOrder) => {
              const isBuy = order.side === 'BUY';

              return (
                <tr key={order.id} className="trading-table-row transition-colors">
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 font-mono text-xs text-zinc-400 whitespace-nowrap">
                    {order.timestamp}
                  </td>

                  {/* Action (BUY / SELL) */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        isBuy
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isBuy ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {order.side}
                    </span>
                  </td>

                  {/* Asset */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-xs">{order.symbol}</span>
                      <span className="text-xs text-zinc-400 truncate max-w-[150px]">{order.companyName}</span>
                    </div>
                  </td>

                  {/* Shares */}
                  <td className="py-3.5 px-4 text-right font-mono text-zinc-200">
                    {order.shares.toLocaleString()}
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                    ${order.executionPrice.toFixed(2)}
                  </td>

                  {/* Total Value */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                    ${order.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      {order.status}
                    </span>
                  </td>

                  {/* Order ID */}
                  <td className="py-3.5 px-4 text-right font-mono text-[11px] text-zinc-500">
                    {order.id}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
