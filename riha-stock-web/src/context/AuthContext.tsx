import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types/auth';
import { StockApiClient } from '../services/stockApiClient';

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(StockApiClient.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session from verified JWT in localStorage or URL redirect params
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if returning from Google OAuth redirect (e.g. ?token=... or ?email=...)
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get('token') || urlParams.get('access_token') || urlParams.get('jwt');
        const queryEmail = urlParams.get('email');

        if (queryToken) {
          StockApiClient.setToken(queryToken);
          setToken(queryToken);
          // Clean URL params cleanly without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const activeToken = StockApiClient.getToken();
        if (activeToken) {
          try {
            const profile = await StockApiClient.getUserProfile();
            setUser({
              id: String(profile.id || profile.userId || 'usr_live'),
              name: profile.name || profile.displayName || (profile.email ? profile.email.split('@')[0] : 'Trader'),
              email: profile.email || queryEmail || '',
              avatar: profile.picture || profile.avatar,
              tier: profile.tier || (profile.roles?.includes('ROLE_ADMIN') ? 'Enterprise Institutional' : 'Professional Trader'),
              accountNumber: profile.accountNumber || `RH-${String(profile.id || '8849').padStart(6, '0')}`,
              cashBalance: Number(profile.cashBalance || 100000.00),
              buyingPower: Number(profile.buyingPower || 400000.00),
              portfolioValue: Number(profile.portfolioValue || 100000.00),
              roles: profile.roles || ['ROLE_USER'],
            });
          } catch (profileErr) {
            console.warn('Profile fetch with token failed, clearing expired session:', profileErr);
            StockApiClient.setToken(null);
            setToken(null);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        setError(err.message || 'Authentication error');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Google OAuth Login
  const loginWithGoogle = async (googleCredential?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      if (googleCredential) {
        // Send Google ID token to riha-auth-service /auth/google
        const res = await StockApiClient.authenticateGoogle(googleCredential);
        setToken(res.token);
        const profile = await StockApiClient.getUserProfile();
        setUser({
          id: String(profile.id || 'usr_google'),
          name: profile.name || res.name || 'Google Verified Trader',
          email: profile.email || res.email || '',
          avatar: profile.picture,
          tier: 'Professional Trader',
          accountNumber: `RH-G${Math.floor(100000 + Math.random() * 900000)}`,
          cashBalance: 100000.00,
          buyingPower: 400000.00,
          portfolioValue: 100000.00,
        });
        return true;
      } else {
        // Redirect to riha-auth-service Google OAuth endpoint
        window.location.href = StockApiClient.getGoogleAuthUrl();
        return true;
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      setError(err.message || 'Google authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Standard email/password login against riha-auth-service
  const loginWithCredentials = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await StockApiClient.authenticateLogin(email, password);
      setToken(res.token);
      const profile = await StockApiClient.getUserProfile().catch(() => ({
        id: 'usr_' + Date.now(),
        email,
        name: email.split('@')[0],
      }));

      setUser({
        id: String(profile.id || 'usr_live'),
        name: profile.name || email.split('@')[0],
        email: profile.email || email,
        avatar: profile.picture,
        tier: 'Professional Trader',
        accountNumber: `RH-${Math.floor(100000 + Math.random() * 900000)}`,
        cashBalance: 100000.00,
        buyingPower: 400000.00,
        portfolioValue: 100000.00,
      });
      return true;
    } catch (err: any) {
      console.error('Credentials login failed:', err);
      setError(err.message || 'Invalid email or password');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    StockApiClient.setToken(null);
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('riha_auth_jwt');
  };

  const updateCashBalance = (amountDelta: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const newCash = Math.max(0, prev.cashBalance + amountDelta);
      return {
        ...prev,
        cashBalance: newCash,
        buyingPower: newCash * 4,
        portfolioValue: prev.portfolioValue + amountDelta,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!token,
        token,
        isLoading,
        error,
        loginWithGoogle,
        loginWithCredentials,
        logout,
        updateCashBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
