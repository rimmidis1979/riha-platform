import React from 'react';

// Dynamic cache updated in real time from broker APIs, filings, and holdings
const DYNAMIC_STOCK_NAMES = new Map<string, string>();

// Institutional stock names dictionary for instant hover lookup across all pages
const KNOWN_STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  NVDA: 'NVIDIA Corporation',
  TSLA: 'Tesla, Inc.',
  MSFT: 'Microsoft Corporation',
  AMZN: 'Amazon.com, Inc.',
  GOOG: 'Alphabet Inc. (Class C)',
  GOOGL: 'Alphabet Inc. (Class A)',
  META: 'Meta Platforms, Inc.',
  AMD: 'Advanced Micro Devices, Inc.',
  INTC: 'Intel Corporation',
  NFLX: 'Netflix, Inc.',
  PLTR: 'Palantir Technologies Inc.',
  COIN: 'Coinbase Global, Inc.',
  SMX: 'Security Matters Ltd',
  HOOD: 'Robinhood Markets, Inc.',
  SCHW: 'The Charles Schwab Corporation',
  SPY: 'SPDR S&P 500 ETF Trust',
  QQQ: 'Invesco QQQ Trust',
  DIA: 'SPDR Dow Jones Industrial Average ETF',
  IWM: 'iShares Russell 2000 ETF',
  VXX: 'iPath Series B S&P 500 VIX Short-Term Futures ETN',
  SOXL: 'Direxion Daily Semiconductor Bull 3X Shares',
  TQQQ: 'ProShares UltraPro QQQ',
  SQQQ: 'ProShares UltraPro Short QQQ',
  AVGO: 'Broadcom Inc.',
  ARM: 'Arm Holdings plc',
  QCOM: 'Qualcomm Incorporated',
  MU: 'Micron Technology, Inc.',
  TSM: 'Taiwan Semiconductor Manufacturing Co.',
  ASML: 'ASML Holding N.V.',
  CRM: 'Salesforce, Inc.',
  ORCL: 'Oracle Corporation',
  ADBE: 'Adobe Inc.',
  NOW: 'ServiceNow, Inc.',
  UBER: 'Uber Technologies, Inc.',
  ABNB: 'Airbnb, Inc.',
  PYPL: 'PayPal Holdings, Inc.',
  DIS: 'The Walt Disney Company',
  BA: 'The Boeing Company',
  CAT: 'Caterpillar Inc.',
  JPM: 'JPMorgan Chase & Co.',
  BAC: 'Bank of America Corporation',
  WFC: 'Wells Fargo & Company',
  GS: 'The Goldman Sachs Group, Inc.',
  MS: 'Morgan Stanley',
  V: 'Visa Inc.',
  MA: 'Mastercard Incorporated',
  XOM: 'Exxon Mobil Corporation',
  CVX: 'Chevron Corporation',
  COP: 'ConocoPhillips',
  LLY: 'Eli Lilly and Company',
  UNH: 'UnitedHealth Group Incorporated',
  JNJ: 'Johnson & Johnson',
  PFE: 'Pfizer Inc.',
  MRK: 'Merck & Co., Inc.',
  ABBV: 'AbbVie Inc.',
  COST: 'Costco Wholesale Corporation',
  WMT: 'Walmart Inc.',
  TGT: 'Target Corporation',
  HD: 'The Home Depot, Inc.',
  NKE: 'NIKE, Inc.',
  MCD: 'McDonald\'s Corporation',
  SBUX: 'Starbucks Corporation',
};

/**
 * Register or update stock name dynamically from live API payloads
 */
export function registerStockName(symbol?: string, name?: string): void {
  if (!symbol || !name) return;
  const cleanSym = symbol.trim().toUpperCase();
  const cleanName = name.trim();
  if (cleanName && cleanName !== cleanSym && !cleanName.startsWith('UNKNOWN')) {
    DYNAMIC_STOCK_NAMES.set(cleanSym, cleanName);
  }
}

/**
 * Look up full stock name with fallback
 */
export function getStockName(symbol?: string, fallbackName?: string): string {
  if (!symbol) return '';
  const clean = symbol.trim().toUpperCase();
  if (fallbackName && fallbackName.trim() && fallbackName.trim().toUpperCase() !== clean) {
    registerStockName(clean, fallbackName);
    return fallbackName.trim();
  }
  if (DYNAMIC_STOCK_NAMES.has(clean)) {
    return DYNAMIC_STOCK_NAMES.get(clean)!;
  }
  if (KNOWN_STOCK_NAMES[clean]) {
    return KNOWN_STOCK_NAMES[clean];
  }
  return `${clean} Common Stock`;
}

interface TickerHoverLabelProps {
  ticker: string;
  name?: string;
  className?: string;
  badgeClassName?: string;
  showSubtitle?: boolean;
}

/**
 * Modern dark-mode ticker label with native hover title and floating tooltip
 */
export const TickerHoverLabel: React.FC<TickerHoverLabelProps> = ({
  ticker,
  name,
  className = '',
  badgeClassName = '',
  showSubtitle = false,
}) => {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  const resolvedName = getStockName(cleanTicker, name);

  return (
    <div
      className={`relative inline-flex items-center group cursor-pointer ${className}`}
      title={`${cleanTicker} — ${resolvedName}`}
    >
      <div className="flex flex-col">
        <span
          className={`font-mono font-bold tracking-tight text-white hover:text-indigo-300 transition-colors ${badgeClassName}`}
        >
          {cleanTicker}
        </span>
        {showSubtitle && (
          <span className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]">
            {resolvedName}
          </span>
        )}
      </div>

      {/* Floating Hover Tooltip Pill */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200">
        <div className="px-2.5 py-1 rounded-lg bg-slate-900/95 text-slate-100 text-[11px] font-sans font-semibold border border-slate-700/80 shadow-xl whitespace-nowrap backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-indigo-400">{cleanTicker}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-200">{resolvedName}</span>
          </div>
        </div>
        <div className="w-1.5 h-1.5 rotate-45 bg-slate-900 border-r border-b border-slate-700/80 -mt-0.5" />
      </div>
    </div>
  );
};
