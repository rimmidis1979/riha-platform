import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  FileSpreadsheet,
  LayoutDashboard,
  Radar,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { ExecutiveCommandWorkspacePage } from './pages/ExecutiveCommandWorkspacePage';
import { TopMoversScannerPage } from './pages/TopMoversScannerPage';
import { RecommendationsControlPage } from './pages/RecommendationsControlPage';
import { CriticReviewsInspectorPage } from './pages/CriticReviewsInspectorPage';
import { MasterAuditSummaryPage } from './pages/MasterAuditSummaryPage';
import { DecisionsFeedPage } from './pages/DecisionsFeedPage';
import { StrategiesScannerPage } from './pages/StrategiesScannerPage';
import { PortfolioGuardrailsPage } from './pages/PortfolioGuardrailsPage';

type RoutePath =
  | '/command'
  | '/scanner'
  | '/recommendations'
  | '/critic-reviews'
  | '/audit-summary'
  | '/decisions'
  | '/strategies'
  | '/portfolio';

function resolveRoute(pathname: string): RoutePath {
  if (pathname.startsWith('/scanner')) return '/scanner';
  if (pathname.startsWith('/recommendations')) return '/recommendations';
  if (pathname.startsWith('/critic-reviews')) return '/critic-reviews';
  if (pathname.startsWith('/audit-summary')) return '/audit-summary';
  if (pathname.startsWith('/decisions')) return '/decisions';
  if (pathname.startsWith('/strategies')) return '/strategies';
  if (pathname.startsWith('/portfolio')) return '/portfolio';
  return '/command';
}

export const App: React.FC = () => {
  const [route, setRoute] = useState<RoutePath>(() =>
    resolveRoute(window.location.pathname)
  );

  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({}, '', '/command');
      setRoute('/command');
    }
    const onPopState = () => setRoute(resolveRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextRoute: RoutePath) => {
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
  };

  const navItems: Array<{ path: RoutePath; label: string; icon: React.ReactNode }> = [
    { path: '/command', label: 'Command Center', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { path: '/scanner', label: '/scanner', icon: <Radar className="w-3.5 h-3.5" /> },
    { path: '/recommendations', label: '/recommendations', icon: <Zap className="w-3.5 h-3.5" /> },
    { path: '/critic-reviews', label: '/critic-reviews', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { path: '/audit-summary', label: '/audit-summary', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { path: '/decisions', label: '/decisions', icon: <Activity className="w-3.5 h-3.5" /> },
    { path: '/strategies', label: '/strategies', icon: <Cpu className="w-3.5 h-3.5" /> },
    { path: '/portfolio', label: '/portfolio', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Eclipse Onyx Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">riha-stock-ai-web</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300">
                  productId = RIHA_STOCK_AI
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">
                RIHA Agentic AI Executive Trading Command, Underneath 4-Pillar Analysis &amp; Audit Ledger
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition ${
                  route === item.path
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                    : 'bg-zinc-900/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {route === '/command' && <ExecutiveCommandWorkspacePage />}
        {route === '/scanner' && <TopMoversScannerPage />}
        {route === '/recommendations' && <RecommendationsControlPage />}
        {route === '/critic-reviews' && <CriticReviewsInspectorPage />}
        {route === '/audit-summary' && <MasterAuditSummaryPage />}
        {route === '/decisions' && <DecisionsFeedPage />}
        {route === '/strategies' && <StrategiesScannerPage />}
        {route === '/portfolio' && <PortfolioGuardrailsPage />}
      </main>
    </div>
  );
};

export default App;
