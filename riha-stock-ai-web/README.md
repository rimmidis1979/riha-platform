# RIHA Stock AI Executive Workstation (`riha-stock-ai-web`)

**React 18 + Vite Executive Portfolio Workstation, Multi-Algorithm Watchlist Scanner & Decision X-Ray Viewer**

- **Port**: `5174` (Nginx container in production)
- **Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Live SSE Streaming**: Real-time event consumption from `riha-stock-ai-strategy-service` (`:8093`)

---

## 1. Architectural Responsibility & User Experience

`riha-stock-ai-web` provides a high-density, institutional-grade command workstation for portfolio managers, traders, and autonomous AI observers.

### Workstation Views & Features:
1. **Personalized Account Ribbon**: Real-time net liquidation value, cash balance, margin utilization, daily PnL, and win-rate percentage.
2. **Watchlist & Multi-Algorithm Scanner**: Real-time monitoring across 5 discovery algorithms (`TOP_GAINERS_DAY`, `RVOL_BREAKOUT`, `SHORT_SQUEEZE_MICROCAP`, `VWAP_RECLAIM`, `HIGH_CONVICTION_MULTI_FACTOR`).
3. **Underneath 4-Pillar Deep Analysis Drawer**:
   - **Technical Pillar**: VWAP, EMA 9/21 cross, RSI-14, MACD histogram, and Level-2 order book liquidity.
   - **SEC & Dilution Pillar**: Active S-3/ATM shelf status, Form 4 insider flow, and dilution catalyst indicators.
   - **Critic Review Pillar**: Deterministic SpEL risk check verification, semantic score breakdown, and remediation feedback.
   - **Strategy Rationale Pillar**: LLM synthesis justification and projected price targets.
4. **Interactive Order Ticket & Smart Bracket Modal**: Manual override, cost-basis recalculation, and automated bracket order configuration.

---

## 2. Local Development & Build

```bash
# Install dependencies
npm install

# Run local development server (http://localhost:5174)
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 3. Service Operations & Management Scripts

This application container includes dedicated lifecycle and deployment automation scripts that interact directly with AWS ECS Fargate:

### 1. Start / Scale-Up Service
Scales the ECS task count from 0 (idle) to the desired count (default: 1) and waits for health stability:
```bash
./start.sh [desired-count]
# Example: start 1 instance
./start.sh 1
```

### 2. Stop / Scale-to-Zero Service
Scales the ECS task count to 0 for instant zero-idle compute cost:
```bash
./stop.sh
```

### 3. Check Live Status & Health
Fetches real-time ECS service status, task ARNs, desired/running task counts, container IPs, and ALB ingress health:
```bash
./status.sh
```

### 4. Build, Tag & Deploy Service
Builds the production multi-stage Docker container (Vite build + Nginx alpine), pushes to Docker Hub (`rimmidis/riha-platform:riha-stock-ai-web`), updates the ECS task definition, and rolls out the deployment:
```bash
./deploy.sh [image-tag] [desired-count]
# Example: deploy latest image with 1 task
./deploy.sh latest 1
```

