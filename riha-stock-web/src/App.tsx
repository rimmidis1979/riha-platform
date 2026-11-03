import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import { Navbar } from './components/common/Navbar';
import { ToastNotification } from './components/common/ToastNotification';
import { TradeModal } from './components/trading/TradeModal';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { TrendingStocksPage } from './pages/TrendingStocksPage';
import { PersonalizedWatchlist } from './components/trending/PersonalizedWatchlist';
import { StrategyAnalysisPage } from './pages/StrategyAnalysisPage';
import { AgentExecutionTableView } from './pages/AgentExecutionTableView';
import { ShieldCheck, Cpu } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution'>('account');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Connecting to RIHA Platform...</p>
        </div>
      </div>
    );
  }

  // Must login to see landing page - Always lands on LoginPage if unauthenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation - Clean tabs without portfolio value or buying power */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'account' && (
          <AccountPage
            onExploreTrending={() => setActiveTab('trending')}
            onNavigateToStrategies={(ticker) => {
              sessionStorage.setItem('riha_selected_strategy_ticker', ticker);
              setActiveTab('strategies');
            }}
          />
        )}

        {activeTab === 'trending' && (
          <TrendingStocksPage />
        )}

        {activeTab === 'strategies' && (
          <StrategyAnalysisPage />
        )}

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
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Personalized Watchlist
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Your pinned stock selections with real-time price updates and 1-click trade execution.
              </p>
            </div>
            <PersonalizedWatchlist onExploreMore={() => setActiveTab('trending')} />
          </div>
        )}
      </main>

      {/* Global Trade Modal */}
      <TradeModal />

      {/* Global Toast Notifications */}
      <ToastNotification />

      {/* Enterprise Platform Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900">RIHA Stock Trading Platform</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Google OAuth 2.0 &amp; JWT Verified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <Cpu className="w-3.5 h-3.5" /> AWS ECS Fargate Mesh
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span>Market Feeds: <strong>Real-Time Stream</strong></span>
            <span>•</span>
            <span>Execution Latency: <strong>8ms</strong></span>
          </div>
        </div>
      </footer>
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
