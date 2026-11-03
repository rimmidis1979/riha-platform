import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Flame,
  Star,
  Layers,
  Workflow,
  Activity,
  Zap,
  ArrowRight,
  TrendingUp,
  X,
  Sliders,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { getStockName } from '../../utils/stockNames';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history') => void;
  onSelectTicker?: (ticker: string) => void;
  onToggleDensity?: () => void;
  density?: 'comfortable' | 'dense';
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectTicker,
  onToggleDensity,
  density = 'comfortable',
}) => {
  const { holdings, personalizedWatchlist, trendingStocks, openTradeModal } = useTrading();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build searchable items
  const routeItems = [
    {
      id: 'nav-account',
      type: 'NAVIGATION' as const,
      label: 'Account & Portfolio Overview',
      sublabel: 'View live positions, PnL, cash balances, and volume strategies',
      icon: <LayoutDashboard className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onNavigate('account');
        onClose();
      },
    },
    {
      id: 'nav-trending',
      type: 'NAVIGATION' as const,
      label: 'Trending Movers & Market Discovery',
      sublabel: 'Explore multi-factor scanned market momentum tickers',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      action: () => {
        onNavigate('trending');
        onClose();
      },
    },
    {
      id: 'nav-watchlist',
      type: 'NAVIGATION' as const,
      label: 'Personalized Stock Watchlist',
      sublabel: 'Monitor your pinned high-conviction tickers',
      icon: <Star className="w-4 h-4 text-blue-400" />,
      action: () => {
        onNavigate('watchlist');
        onClose();
      },
    },
    {
      id: 'nav-strategies',
      type: 'NAVIGATION' as const,
      label: 'Strategy Diagnostics & Multi-Factor Scoring',
      sublabel: 'Technical indicators, sentiment analysis, and risk scoring',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onNavigate('strategies');
        onClose();
      },
    },
    {
      id: 'nav-agent',
      type: 'NAVIGATION' as const,
      label: 'Agent Execution Pipeline Trace',
      sublabel: 'Inspect real-time asynchronous multi-agent orchestrator logs',
      icon: <Workflow className="w-4 h-4 text-purple-400" />,
      action: () => {
        onNavigate('agent-execution');
        onClose();
      },
    },
    {
      id: 'nav-audit',
      type: 'NAVIGATION' as const,
      label: 'Audit Ledger, Auto-Loops & Realized PnL',
      sublabel: 'Verify transactional history, login audit trail, and loop runners',
      icon: <Activity className="w-4 h-4 text-sky-400" />,
      action: () => {
        onNavigate('audit-history');
        onClose();
      },
    },
  ];

  // Quick Action items
  const actionItems = [
    {
      id: 'act-density',
      type: 'ACTION' as const,
      label: `Toggle Table Density (Currently ${density.toUpperCase()})`,
      sublabel: 'Switch between comfortable 8pt padding and compact dense mode',
      icon: <Sliders className="w-4 h-4 text-cyan-400" />,
      action: () => {
        if (onToggleDensity) onToggleDensity();
        onClose();
      },
    },
  ];

  // Stock items from holdings and watchlist
  const stockMap = new Map<string, { symbol: string; companyName: string; price?: number; source: string }>();

  holdings.forEach((h) => {
    stockMap.set(h.symbol, {
      symbol: h.symbol,
      companyName: h.name || h.companyName || getStockName(h.symbol),
      price: h.currentPrice,
      source: 'PORTFOLIO HOLDING',
    });
  });

  personalizedWatchlist.forEach((w) => {
    if (!stockMap.has(w.symbol)) {
      stockMap.set(w.symbol, {
        symbol: w.symbol,
        companyName: w.companyName || getStockName(w.symbol),
        price: w.price,
        source: 'WATCHLIST',
      });
    }
  });

  trendingStocks.forEach((t) => {
    if (!stockMap.has(t.symbol)) {
      stockMap.set(t.symbol, {
        symbol: t.symbol,
        companyName: t.companyName || getStockName(t.symbol),
        price: t.price,
        source: 'TRENDING SCANNER',
      });
    }
  });

  const stockItems = Array.from(stockMap.values()).map((stock) => ({
    id: `stock-${stock.symbol}`,
    type: 'STOCK' as const,
    label: stock.symbol,
    sublabel: `${stock.companyName} • ${stock.source}`,
    price: stock.price,
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    action: () => {
      if (onSelectTicker) {
        onSelectTicker(stock.symbol);
      }
      onClose();
    },
  }));

  // Filter items
  const cleanQuery = query.trim().toLowerCase();
  const filteredRoutes = cleanQuery
    ? routeItems.filter(
        (r) =>
          r.label.toLowerCase().includes(cleanQuery) ||
          r.sublabel.toLowerCase().includes(cleanQuery)
      )
    : routeItems;

  const filteredStocks = cleanQuery
    ? stockItems.filter(
        (s) =>
          s.label.toLowerCase().includes(cleanQuery) ||
          s.sublabel.toLowerCase().includes(cleanQuery)
      )
    : stockItems.slice(0, 5);

  const filteredActions = cleanQuery
    ? actionItems.filter(
        (a) =>
          a.label.toLowerCase().includes(cleanQuery) ||
          a.sublabel.toLowerCase().includes(cleanQuery)
      )
    : actionItems;

  const allItems = [...filteredRoutes, ...filteredStocks, ...filteredActions];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0d1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-[#0f172a]/90">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tickers, views, or execute actions (e.g. AAPL, Portfolio, Density)..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 divide-y divide-slate-800/60">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No matching tickers or command actions found for "{query}".
            </div>
          ) : (
            <>
              {/* Navigation Section */}
              {filteredRoutes.length > 0 && (
                <div className="pt-2 first:pt-0">
                  <div className="px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Platform Navigation
                  </div>
                  <div className="space-y-1 mt-1">
                    {filteredRoutes.map((item) => {
                      const idx = allItems.indexOf(item);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500'
                              : 'text-slate-300 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 truncate">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {item.sublabel}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tickers Section */}
              {filteredStocks.length > 0 && (
                <div className="pt-3">
                  <div className="px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Equities &amp; Shortlist Tickers</span>
                    <span className="text-[10px] text-slate-500">TABULAR-NUMS</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {filteredStocks.map((item) => {
                      const idx = allItems.indexOf(item);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500'
                              : 'text-slate-300 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-white">
                                  {item.label}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {item.sublabel}
                              </div>
                            </div>
                          </div>
                          {item.price !== undefined && (
                            <div className="text-right font-mono tabular-nums text-xs font-bold text-slate-100 shrink-0 ml-2">
                              ${item.price.toFixed(2)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Section */}
              {filteredActions.length > 0 && (
                <div className="pt-3">
                  <div className="px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Display &amp; Preferences
                  </div>
                  <div className="space-y-1 mt-1">
                    {filteredActions.map((item) => {
                      const idx = allItems.indexOf(item);
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500'
                              : 'text-slate-300 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 truncate">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {item.sublabel}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#0b0f19] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-slate-500 font-mono">Enterprise Terminal Palette</span>
        </div>
      </div>
    </div>
  );
};

