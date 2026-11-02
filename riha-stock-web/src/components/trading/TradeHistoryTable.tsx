import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { OrderSide } from '../../types/trading';
import { History, Download, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';

export const TradeHistoryTable: React.FC = () => {
  const { tradeHistory } = useTrading();
  const [filterSide, setFilterSide] = useState<'ALL' | OrderSide>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = tradeHistory.filter((item) => {
    const matchesSide = filterSide === 'ALL' || item.side === filterSide;
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSide && matchesSearch;
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Stock Purchase &amp; Order History ({filteredHistory.length} Executions)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit ledger of executed stock purchases and sales</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Side Filter Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterSide === side
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No trade history recorded yet</p>
          <p className="mt-0.5">Executed buy and sell orders will appear here in chronological sequence.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500">
                <th className="py-3 px-4 font-semibold">Order ID</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold text-center">Type / Side</th>
                <th className="py-3 px-4 font-semibold">Asset / Symbol</th>
                <th className="py-3 px-4 font-semibold text-right">Shares</th>
                <th className="py-3 px-4 font-semibold text-right">Exec Price</th>
                <th className="py-3 px-4 font-semibold text-right">Total Value</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredHistory.map((item) => {
                const isBuy = item.side === 'BUY';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {item.id}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {item.timestamp}
                    </td>

                    {/* Side (BUY / SELL) */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          isBuy
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {item.side}
                      </span>
                    </td>

                    {/* Symbol */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{item.symbol}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[140px]">{item.companyName}</div>
                    </td>

                    {/* Shares */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                      {item.shares.toLocaleString()}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ${item.executionPrice.toFixed(2)}
                    </td>

                    {/* Total Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                      ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
