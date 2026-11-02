import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';
import { Navbar } from './components/common/Navbar';
import { ToastNotification } from './components/common/ToastNotification';
import { TradeModal } from './components/trading/TradeModal';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { TrendingStocksPage } from './pages/TrendingStocksPage';
import { ShieldCheck, Cpu, Terminal } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'trending' | 'watchlist'>('account');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'account' && (
          <AccountPage onExploreTrending={() => setActiveTab('trending')} />
        )}

        {(activeTab === 'trending' || activeTab === 'watchlist') && (
          <TrendingStocksPage />
        )}
      </main>

      {/* Global Trade Modal */}
      <TradeModal />

      {/* Global Toast Notifications */}
      <ToastNotification />

      {/* Enterprise Platform Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/60 py-6 text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-300">riha-stock-web v1.0.0</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Google OAuth 2.0 &amp; JWT Verified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Cpu className="w-3.5 h-3.5" /> AWS ECS Fargate Mesh
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span>Market Feed: <strong>NASDAQ L2 / Live Websocket</strong></span>
            <span>•</span>
            <span>Execution Latency: <strong>8ms</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <TradingProvider>
        <MainAppContent />
      </TradingProvider>
    </AuthProvider>
  );
}

export default App;
