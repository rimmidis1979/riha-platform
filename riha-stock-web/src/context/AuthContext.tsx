import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types/auth';
import { DEMO_USERS } from '../services/mockData';
import { StockApiClient } from '../services/stockApiClient';

interface AuthContextType extends AuthState {
  loginWithGoogle: () => Promise<void>;
  simulateGoogleCallback: (googleUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'riha_stock_auth_user';
const TOKEN_STORAGE_KEY = 'riha_stock_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default to Alex Chen for instant frictionless preview
    return DEMO_USERS[0];
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || 'riha-jwt-session-token-demo';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync token to StockApiClient
  useEffect(() => {
    StockApiClient.setToken(token);
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [user, token]);

  // Check URL query parameters for Google OAuth redirect callback (e.g. ?token=...&email=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token') || params.get('access_token');
    const oauthEmail = params.get('email');
    const oauthName = params.get('name');

    if (oauthToken && oauthEmail) {
      const googleUser: User = {
        id: `google_${Date.now()}`,
        name: oauthName || oauthEmail.split('@')[0],
        email: oauthEmail,
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        tier: 'Professional',
        accountNumber: `GOOG-${Math.floor(1000 + Math.random() * 9000)}`,
        cashBalance: 50000.00,
        buyingPower: 100000.00,
        portfolioValue: 150000.00,
      };

      setUser(googleUser);
      setToken(oauthToken);

      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Standard Email/Password Login
  const login = async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const matchedUser = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());

    const loggedInUser: User = matchedUser || {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0],
      email: email,
      tier: 'Individual',
      accountNumber: `RH-${Math.floor(1000 + Math.random() * 9000)}`,
      cashBalance: 25000.00,
      buyingPower: 50000.00,
      portfolioValue: 75000.00,
    };

    const jwtToken = `riha-jwt-${Date.now()}-${btoa(email)}`;
    setUser(loggedInUser);
    setToken(jwtToken);
    setIsLoading(false);
    return true;
  };

  // Google OAuth Login Action
  const loginWithGoogle = async (): Promise<void> => {
    setIsLoading(true);

    // If backend auth-service is available, redirect to OAuth2 authorization endpoint
    const googleAuthUrl = StockApiClient.getGoogleAuthUrl();

    // Check if auth-service is reachable
    try {
      const res = await fetch(`${googleAuthUrl}`, { method: 'HEAD', mode: 'no-cors' });
      // If we are running in an environment that can redirect to Google OAuth:
      window.location.href = googleAuthUrl;
    } catch {
      // Offline/Local dev fallback: simulate direct Google Identity Authentication
      await new Promise((resolve) => setTimeout(resolve, 800));
      const googleUser: User = {
        id: 'google_1089234857123',
        name: 'Ram (Google Investor)',
        email: 'ram.ai@rihasoftwaresolutions.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        tier: 'VIP Institutional',
        accountNumber: 'GOOG-8821-PRO',
        cashBalance: 65400.50,
        buyingPower: 130801.00,
        portfolioValue: 248900.00,
      };
      setUser(googleUser);
      setToken('google-oauth2-verified-jwt-token-2026');
      setIsLoading(false);
    }
  };

  // Simulate specific Google Account login for quick testing
  const simulateGoogleCallback = (googleUser: Partial<User>) => {
    const fullUser: User = {
      id: googleUser.id || `goog_${Date.now()}`,
      name: googleUser.name || 'Google Trader',
      email: googleUser.email || 'trader@gmail.com',
      avatar: googleUser.avatar || 'https://lh3.googleusercontent.com/a/default-user',
      tier: googleUser.tier || 'Professional',
      accountNumber: googleUser.accountNumber || `GOOG-${Math.floor(1000 + Math.random() * 9000)}`,
      cashBalance: googleUser.cashBalance || 50000.00,
      buyingPower: (googleUser.cashBalance || 50000.00) * 2,
      portfolioValue: googleUser.portfolioValue || 175000.00,
    };
    setUser(fullUser);
    setToken(`google-oauth-token-${Date.now()}`);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateCashBalance = (delta: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const newCash = Math.max(0, prev.cashBalance + delta);
      return {
        ...prev,
        cashBalance: newCash,
        buyingPower: newCash * 2,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        token,
        isLoading,
        login,
        loginWithGoogle,
        simulateGoogleCallback,
        logout,
        updateCashBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
