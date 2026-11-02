# RIHA Stock Web (`riha-stock-web`)
> Personalized Real-Time Stock Trading Platform with Google Authentication, Portfolio Analytics, Multi-Timeframe Performance, and Trending Stock Discovery.

---

## Capabilities Overview

### 1. User Authentication (Google OAuth 2.0 & JWT)
- **Google Single Sign-On**: One-click Google login integrating with `riha-auth-service` via `/oauth2/authorization/google` or direct OAuth 2.0 callback parameter parsing (`?token=...&email=...`).
- **Profile Management**: Displays Google verified badge, profile photo, trading tier, and account number.
- **1-Click Demo Profiles**: Quick testing with institutional, professional, and retail investor personas.
- **Session Persistence**: Automatic token and user profile storage in browser `localStorage`.

### 2. User Account & Personalized Portfolio
- **Holdings Management**: Comprehensive breakdown of owned stocks, share quantities, average cost basis, current market prices, total equity valuation, today's P&L ($ and %), and all-time unrealized return.
- **Buy and Sell Options**: Real-time Order Pad and Modal supporting:
  - Market Orders, Limit Orders, and Stop Loss
  - Share calculations with quick fraction selectors (25%, 50%, 75%, MAX)
  - Real-time buying power validation and instant ledger updates
- **Stock Purchase & Trading History**: Complete immutable audit trail with execution timestamp, order side (`BUY` / `SELL`), shares filled, fill price, total value, and one-click CSV export.
- **Overall Performance Chart**:
  - Interactive SVG performance curve with timeframe selections: **1D (Day)**, **1W (Week)**, **1M (Month)**, **1Y (Year)**, and **ALL**.
  - Dynamic comparison curve against S&P 500 Index (SPY Benchmark).
  - Alpha, Sharpe Ratio, and Maximum Drawdown metrics.

### 3. Trending Stocks Scanner & Personalized Watchlist
- **Market Movers & High-Alpha Momentum**: Real-time scanner tracking prices, 24h volume, and market capitalization.
- **Multi-Dimensional Filters**:
  - **Stock Price Limits**: Adjustable min and max price sliders ($10 to $500+).
  - **Stock News & Catalysts**: Sentiment filtering (Bullish, Neutral, Breaking News) with headline previews and publication timestamps.
  - **SEC Regulatory Filings**: Form 8-K (Material Events), Form 10-Q (Quarterly), Form 10-K (Annual), and Form 4 (Insider Buys).
  - **AI Predictions & Sentiment**: RIHA AI Score (`STRONG_BUY`, `BUY`, `SPECULATIVE_BUY`) and Social Sentiment buzz rating.
- **Manual Personalized Selection**: One-click star button to pin any trending stock to the user's **Personalized Watchlist** for dedicated tracking and quick trade execution.

---

## Local Development

```bash
# Navigate to app directory
cd riha-stock-web

# Install dependencies (if not linked)
npm install

# Start Vite dev server on port 5175
npm run dev

# Build production bundle
npm run build
```

---

## Docker & Container Deployment

```bash
# Build production bundle
npm run build

# Build Docker image
docker build -t rimmidis/riha-platform:riha-stock-web-v1 .

# Run container locally on port 80 or 5175
docker run -d -p 5175:80 --name riha-stock-web rimmidis/riha-platform:riha-stock-web-v1
```

