import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import { Sidebar } from './components/common/Sidebar';
import { AdminHeader } from './components/common/AdminHeader';
import { ToastNotification } from './components/common/ToastNotification';
import { TradeModal } from './components/trading/TradeModal';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { TrendingStocksPage } from './pages/TrendingStocksPage';
import { PersonalizedWatchlist } from './components/trending/PersonalizedWatchlist';
import { StrategyAnalysisPage } from './pages/StrategyAnalysisPage';
import { AgentExecutionTableView } from './pages/AgentExecutionTableView';
import { PlatformAuditHistoryPage } from './pages/PlatformAuditHistoryPage';
import { LegalDisclaimerModal } from './components/common/LegalDisclaimerModal';
import { ShieldCheck, Cpu, Radio } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading, disclaimerAccepted } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history'>('account');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono font-bold text-slate-400">Connecting to RIHA Terminal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleQuickSearch = (ticker: string) => {
    sessionStorage.setItem('riha_selected_strategy_ticker', ticker);
    setActiveTab('agent-execution');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans antialiased flex flex-col">
      {/* Left Persistent Dark Admin Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
      />

      {/* Main Admin Content Wrapper (Shifted by Sidebar width on lg+) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Sticky Admin App Bar */}
        <AdminHeader
          activeTab={activeTab}
          onToggleSidebar={() => setSidebarMobileOpen(!sidebarMobileOpen)}
          onQuickSearchTicker={handleQuickSearch}
        />

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'account' && (
            <AccountPage
              onExploreTrending={() => setActiveTab('trending')}
              onNavigateToStrategies={(ticker) => {
                sessionStorage.setItem('riha_selected_strategy_ticker', ticker);
                setActiveTab('strategies');
              }}
            />
          )}

          {activeTab === 'trending' && <TrendingStocksPage />}

          {activeTab === 'strategies' && <StrategyAnalysisPage />}

          {activeTab === 'agent-execution' && (
            <AgentExecutionTableView
              onNavigateToDiagnostics={(ticker) => {
                sessionStorage.setItem('riha_selected_strategy_ticker', ticker);
                setActiveTab('strategies');
              }}
            />
          )}

          {activeTab === 'watchlist' && (
            <div className="space-y-6">
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Personalized Watchlist
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Your pinned high-conviction stock candidates with real-time streaming quotes and 1-click execution.
                </p>
              </div>
              <PersonalizedWatchlist onExploreMore={() => setActiveTab('trending')} />
            </div>
          )}

          {activeTab === 'audit-history' && <PlatformAuditHistoryPage />}
        </main>

        {/* SEC / FINRA Mandatory Trading Legal Disclaimer Modal */}
        <LegalDisclaimerModal isOpen={!disclaimerAccepted} />

        {/* CoreUI Dark Enterprise Footer */}
        <footer className="border-t border-slate-800/80 bg-[#0d121f] py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-300">RIHA Stock AI Platform</span>
              <span>•</span>
              <span className="text-indigo-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> OAuth 2.0 &amp; JWT Verified
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Cpu className="w-3.5 h-3.5" /> Virtual Threads Mesh
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Robinhood API: <strong className="text-emerald-400 ml-1">Live</strong>
              </span>
              <span>•</span>
              <span>Latency: <strong className="text-slate-200">12ms</strong></span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Trade Modal */}
      <TradeModal />

      {/* Global Toast Notifications */}
      <ToastNotification />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TradingProvider>
        <MainAppContent />
      </TradingProvider>
    </AuthProvider>
  );
};

export default App;
