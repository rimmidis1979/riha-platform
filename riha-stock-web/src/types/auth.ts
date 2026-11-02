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
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: (googleCredential?: string) => Promise<boolean>;
  loginWithCredentials: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateCashBalance: (amountDelta: number) => void;
}
