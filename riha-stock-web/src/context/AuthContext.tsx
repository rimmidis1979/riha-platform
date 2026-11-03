import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types/auth';
import { StockApiClient } from '../services/stockApiClient';

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(StockApiClient.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    return localStorage.getItem('riha_disclaimer_accepted') === 'true';
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query backend disclaimer status
        try {
          const disc = await StockApiClient.getDisclaimerStatus();
          setDisclaimerAccepted(disc.disclaimerAccepted);
        } catch (e) {
          console.warn('Disclaimer status check fallback:', e);
        }

        // Check query parameters from Google OAuth redirect
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get('token') || urlParams.get('access_token') || urlParams.get('jwt');
        const queryEmail = urlParams.get('email');

        if (queryToken) {
          StockApiClient.setToken(queryToken);
          setToken(queryToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const savedSession = localStorage.getItem('riha_user_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            // Purge legacy mock data sessions from previous dev runs
            if (
              parsed &&
              (parsed.email === 'trader@google.com' ||
                parsed.email === 'google.trader@rihasoftwaresolutions.com' ||
                parsed.name === 'Google Verified Trader' ||
                parsed.cashBalance === 250000.0)
            ) {
              localStorage.removeItem('riha_user_session');
              localStorage.removeItem('riha_auth_jwt');
              setUser(null);
            } else if (parsed && parsed.email) {
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            localStorage.removeItem('riha_user_session');
          }
        }

        const activeToken = StockApiClient.getToken();
        if (activeToken) {
          try {
            const profile = await StockApiClient.getUserProfile();
            const loadedUser: User = {
              id: String(profile.id || profile.userId || `usr_${Date.now()}`),
              name: profile.name || profile.displayName || (profile.email ? profile.email.split('@')[0] : 'Trader'),
              email: profile.email || queryEmail || '',
              avatar: profile.picture || profile.avatar,
              tier: profile.tier || 'Individual Trader',
              accountNumber: profile.accountNumber || `RH-${String(profile.id || '001')}`,
              cashBalance: Number(profile.cashBalance || 0),
              buyingPower: Number(profile.buyingPower || 0),
              portfolioValue: Number(profile.portfolioValue || 0),
              roles: profile.roles || ['ROLE_USER'],
            };
            setUser(loadedUser);
            localStorage.setItem('riha_user_session', JSON.stringify(loadedUser));
          } catch (profileErr) {
            console.warn('Profile fetch error:', profileErr);
            if (!user) {
              setUser(null);
            }
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
  const loginWithGoogle = async (
    googleCredential?: string,
    realProfile?: { email?: string; name?: string; picture?: string; id?: string }
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      let tokenToUse = '';
      let userEmail = realProfile?.email || '';
      let userName = realProfile?.name || '';
      let userPicture: string | undefined = realProfile?.picture;
      let userId = realProfile?.id || '';

      // If credential is a Google ID token (JWT format), decode profile info directly from Google's token
      if (googleCredential && googleCredential.includes('.')) {
        try {
          const parts = googleCredential.split('.');
          if (parts.length >= 2) {
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const payload = JSON.parse(jsonPayload);
            if (payload.email) userEmail = payload.email;
            if (payload.name) userName = payload.name;
            if (payload.picture) userPicture = payload.picture;
            if (payload.sub) userId = payload.sub;
          }
        } catch (decodeErr) {
          console.warn('Could not decode Google credential JWT:', decodeErr);
        }
      }

      if (!userName && userEmail) {
        userName = userEmail.split('@')[0];
      }

      // If backend auth-service is available, authenticate and obtain backend JWT
      if (googleCredential) {
        try {
          const res = await StockApiClient.authenticateGoogle(googleCredential);
          if (res?.token) {
            tokenToUse = res.token;
            if (res.email) userEmail = res.email;
            if (res.name) userName = res.name;
            if (res.picture) userPicture = res.picture;
          }
        } catch (backendErr: any) {
          console.warn('Backend Google verification endpoint notice (running in local mode):', backendErr);
        }
      }

      if (!tokenToUse) {
        tokenToUse = googleCredential || `google_token_${Date.now()}`;
      }

      StockApiClient.setToken(tokenToUse);
      setToken(tokenToUse);

      const resolvedEmail = userEmail || 'trader@riha.internal';
      const resolvedName = userName || (userEmail ? userEmail.split('@')[0] : 'Trader');
      const resolvedId = userId || String(Date.now());

      const googleUser: User = {
        id: `usr_${resolvedId}`,
        name: resolvedName,
        email: resolvedEmail,
        avatar: userPicture,
        tier: 'Standard Tier',
        accountNumber: `RH-${resolvedId.slice(-6)}`,
        cashBalance: 0.0,
        buyingPower: 0.0,
        portfolioValue: 0.0,
        roles: ['ROLE_USER'],
        disclaimerAccepted,
        disclaimerVersion: 'v1.0',
      };

      setUser(googleUser);
      localStorage.setItem('riha_user_session', JSON.stringify(googleUser));

      // Record in local persistent login audit ledger
      StockApiClient.recordLocalLogin({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: resolvedEmail,
        userId: googleUser.id,
        provider: 'GOOGLE_IDENTITY_SERVICES',
        loginTime: new Date().toISOString(),
        ipAddress: '127.0.0.1 (Local Client)',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser',
        status: 'SUCCESS',
        disclaimerAccepted,
        disclaimerVersion: 'v1.0',
      });

      return true;
    } catch (err: any) {
      console.error('Google login failed:', err);
      setError(err.message || 'Google authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Standard email/password login
  const loginWithCredentials = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      let activeJwt = `session_${Date.now()}`;

      try {
        const res = await StockApiClient.authenticateLogin(email, password);
        if (res?.token) activeJwt = res.token;
      } catch (backendErr) {
        console.warn('Backend auth offline, using session token:', backendErr);
      }

      StockApiClient.setToken(activeJwt);
      setToken(activeJwt);

      const standardUser: User = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0],
        email,
        tier: 'Standard Tier',
        accountNumber: `RH-${String(Date.now()).slice(-6)}`,
        cashBalance: 0.0,
        buyingPower: 0.0,
        portfolioValue: 0.0,
        roles: ['ROLE_USER'],
        disclaimerAccepted,
        disclaimerVersion: 'v1.0',
      };

      setUser(standardUser);
      localStorage.setItem('riha_user_session', JSON.stringify(standardUser));

      StockApiClient.recordLocalLogin({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email,
        userId: standardUser.id,
        provider: 'CREDENTIALS',
        loginTime: new Date().toISOString(),
        ipAddress: '127.0.0.1 (Local Client)',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser',
        status: 'SUCCESS',
        disclaimerAccepted,
        disclaimerVersion: 'v1.0',
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

  const acceptDisclaimer = async () => {
    try {
      await StockApiClient.acceptDisclaimer();
      setDisclaimerAccepted(true);
      if (user) {
        const updated = { ...user, disclaimerAccepted: true, disclaimerAcceptedAt: new Date().toISOString() };
        setUser(updated);
        localStorage.setItem('riha_user_session', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Accept disclaimer error:', e);
      setDisclaimerAccepted(true);
    }
  };

  const declineDisclaimer = async () => {
    try {
      await StockApiClient.declineDisclaimer();
    } catch (e) {
      console.warn('Decline disclaimer error:', e);
    }
    setDisclaimerAccepted(false);
    logout();
  };

  const logout = () => {
    StockApiClient.setToken(null);
    setToken(null);
    setUser(null);
    setError(null);
    setDisclaimerAccepted(false);
    localStorage.removeItem('riha_auth_jwt');
    localStorage.removeItem('riha_user_session');
    localStorage.removeItem('riha_google_session');
  };

  const updateCashBalance = (amountDelta: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const newCash = Math.max(0, prev.cashBalance + amountDelta);
      const updated = {
        ...prev,
        cashBalance: newCash,
        buyingPower: newCash * 4,
        portfolioValue: prev.portfolioValue + amountDelta,
      };
      localStorage.setItem('riha_user_session', JSON.stringify(updated));
      return updated;
    });
  };

  const updateRobinhoodApiKey = async (apiKey: string, accountMask?: string): Promise<boolean> => {
    try {
      await StockApiClient.saveRobinhoodApiKey(apiKey);
      const cleanKey = apiKey.trim();
      const masked = accountMask || (cleanKey.length > 8 ? `${cleanKey.substring(0, 4)}••••${cleanKey.substring(cleanKey.length - 4)}` : 'rh_••••••••');

      setUser((prev) => {
        if (!prev) return null;
        const updated: User = {
          ...prev,
          robinhoodApiKey: cleanKey,
          robinhoodConnected: true,
          robinhoodConnectedAt: new Date().toISOString(),
          robinhoodAccountMask: masked,
        };
        localStorage.setItem('riha_user_session', JSON.stringify(updated));
        return updated;
      });
      return true;
    } catch (e) {
      console.error('Failed to update Robinhood API key:', e);
      return false;
    }
  };

  const disconnectRobinhood = () => {
    StockApiClient.disconnectRobinhood();
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        robinhoodApiKey: undefined,
        robinhoodConnected: false,
        robinhoodConnectedAt: undefined,
        robinhoodAccountMask: undefined,
      };
      localStorage.setItem('riha_user_session', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        token,
        isLoading,
        error,
        disclaimerAccepted,
        loginWithGoogle,
        loginWithCredentials,
        acceptDisclaimer,
        declineDisclaimer,
        logout,
        updateCashBalance,
        updateRobinhoodApiKey,
        disconnectRobinhood,
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
