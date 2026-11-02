export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: 'VIP Institutional' | 'Professional' | 'Individual';
  accountNumber: string;
  cashBalance: number;
  buyingPower: number;
  portfolioValue: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateCashBalance: (amountDelta: number) => void;
}
