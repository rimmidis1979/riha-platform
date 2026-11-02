export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: string;
  accountNumber: string;
  cashBalance: number;
  buyingPower: number;
  portfolioValue: number;
  roles?: string[];
  robinhoodApiKey?: string;
  robinhoodConnected?: boolean;
  robinhoodConnectedAt?: string;
  robinhoodAccountMask?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: (googleCredential?: string, realProfile?: { email?: string; name?: string; picture?: string; id?: string }) => Promise<boolean>;
  loginWithCredentials: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateCashBalance: (amountDelta: number) => void;
  updateRobinhoodApiKey: (apiKey: string, accountMask?: string) => Promise<boolean>;
  disconnectRobinhood: () => void;
}
