/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RIHA_AUTH_API_URL?: string;
  readonly VITE_RIHA_STOCK_STRATEGY_API_URL?: string;
  readonly VITE_RIHA_MARKET_INGESTOR_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
