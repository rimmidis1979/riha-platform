import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart2,
  Cpu,
  FileSpreadsheet,
  Flame,
  LayoutDashboard,
  PieChart,
  Radar,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { PersonalizedDashboardPage } from './pages/PersonalizedDashboardPage';
import { TrendingStocksScannerPage } from './pages/TrendingStocksScannerPage';
import { TechnicalFindingsPage } from './pages/reviews/TechnicalFindingsPage';
import { CriticFindingsPage } from './pages/reviews/CriticFindingsPage';
import { SecAndMemoryFindingsPage } from './pages/reviews/SecAndMemoryFindingsPage';
import { ExecutiveCommandWorkspacePage } from './pages/ExecutiveCommandWorkspacePage';
import { TopMoversScannerPage } from './pages/TopMoversScannerPage';
import { RecommendationsControlPage } from './pages/RecommendationsControlPage';
import { CriticReviewsInspectorPage } from './pages/CriticReviewsInspectorPage';
import { MasterAuditSummaryPage } from './pages/MasterAuditSummaryPage';
import { DecisionsFeedPage } from './pages/DecisionsFeedPage';
import { StrategiesScannerPage } from './pages/StrategiesScannerPage';
import { PortfolioGuardrailsPage } from './pages/PortfolioGuardrailsPage';
import { fetchPersonalizedAccountSummary } from './api/stockAiClient';
import { PersonalizedAccountSummary } from './types/stockAi';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/dashboard');
  const [telemetry, setTelemetry] = useState<PersonalizedAccountSummary | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({}, '', '/dashboard');
      setCurrentPath('/dashboard');
    }
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    fetchPersonalizedAccountSummary()
      .then((data) => setTelemetry(data))
      .catch(() => { });
    const interval = setInterval(() => {
      fetchPersonalizedAccountSummary()
        .then((data) => setTelemetry(data))
        .catch(() => { });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Parser
  const parseStockReviewRoute = (path: string) => {
    const match = path.match(/^\/stocks\/([^/]+)\/review\/(technical|critic|sec-memory)/);
    if (match) {
      return { ticker: match[1].toUpperCase(), tab: match[2] };
    }
    return null;
  };

  const reviewRoute = parseStockReviewRoute(currentPath);

  const mainTabs = [
    {
      path: '/dashboard',
      label: 'Tab 1: My Portfolio',
      sublabel: 'Owned Stocks & Workstation',
      icon: <PieChart className="w-4 h-4" />,
    },
    {
      path: '/trending',
      label: 'Tab 2: Trending Scanner',
      sublabel: 'Algorithmic Stock Scanner',
      icon: <Radar className="w-4 h-4" />,
    },
  ];

  const diagnosticTabs = [
    { path: '/command', label: 'Executive Ledger', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { path: '/critic-reviews', label: 'Critic Audit', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { path: '/audit-summary', label: 'Batch Matrix', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { path: '/decisions', label: 'Decisions Stream', icon: <Activity className="w-3.5 h-3.5" /> },
    { path: '/strategies', label: 'VCH Strategies', icon: <Cpu className="w-3.5 h-3.5" /> },
    { path: '/portfolio', label: 'Guardrails Config', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  const netEquity = telemetry?.netAccountEquityUsd ?? 0.0;
  const buyingPower = telemetry?.liveBuyingPowerUsd ?? 0.0;
  const winRate = telemetry?.winRatePct ?? 0.0;
  const brokerageConnected = telemetry?.brokerageConnected ?? false;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Persistent Eclipse Onyx Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-lg">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white font-mono">riha-stock-ai-web</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300">
                  PORT 5174
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${brokerageConnected ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                  {brokerageConnected ? '● Robinhood Live' : '○ Balance $0.00 (Zero Mock)'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">
                Institutional Agentic Portfolio &amp; Algorithmic Trading Desk
              </p>
            </div>
          </div>

          {/* Live Telemetry Ribbon Badges */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase block">Equity</span>
              <span className="text-white font-bold tabular-nums">${netEquity.toFixed(2)}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase block">Buying Power</span>
              <span className="text-emerald-400 font-bold tabular-nums">${buyingPower.toFixed(2)}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase block">AI Win Rate</span>
              <span className="text-zinc-200 font-bold tabular-nums">{winRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="flex items-center gap-2 text-xs font-mono">
            {mainTabs.map((tab) => {
              const active = currentPath === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 border transition font-medium ${active
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-bold shadow-md'
                    : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Secondary Sub-Navigation for Diagnostics */}
        <div className="border-t border-zinc-800/40 bg-zinc-950/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider shrink-0 mr-1">Ledger &amp; Tools:</span>
            {diagnosticTabs.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition shrink-0 ${currentPath === item.path
                  ? 'bg-zinc-800 text-emerald-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Dedicated Stock Review Routes */}
        {reviewRoute ? (
          reviewRoute.tab === 'technical' ? (
            <TechnicalFindingsPage
              ticker={reviewRoute.ticker}
              onBack={() => navigate('/dashboard')}
              onNavigate={navigate}
            />
          ) : reviewRoute.tab === 'critic' ? (
            <CriticFindingsPage
              ticker={reviewRoute.ticker}
              onBack={() => navigate('/dashboard')}
              onNavigate={navigate}
            />
          ) : reviewRoute.tab === 'sec-memory' ? (
            <SecAndMemoryFindingsPage
              ticker={reviewRoute.ticker}
              onBack={() => navigate('/dashboard')}
              onNavigate={navigate}
            />
          ) : (
            <PersonalizedDashboardPage onNavigate={navigate} />
          )
        ) : (
          /* Main Tab Routes */
          <>
            {currentPath === '/dashboard' && <PersonalizedDashboardPage onNavigate={navigate} />}
            {currentPath === '/trending' && <TrendingStocksScannerPage onNavigate={navigate} />}
            {currentPath === '/command' && <ExecutiveCommandWorkspacePage />}
            {currentPath === '/scanner' && <TopMoversScannerPage />}
            {currentPath === '/recommendations' && <RecommendationsControlPage />}
            {currentPath === '/critic-reviews' && <CriticReviewsInspectorPage />}
            {currentPath === '/audit-summary' && <MasterAuditSummaryPage />}
            {currentPath === '/decisions' && <DecisionsFeedPage />}
            {currentPath === '/strategies' && <StrategiesScannerPage />}
            {currentPath === '/portfolio' && <PortfolioGuardrailsPage />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
