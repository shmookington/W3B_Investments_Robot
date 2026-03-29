# W3B Frontend

> Next.js web application for the W3B quantitative prediction fund.
> CRT/Space Odyssey terminal aesthetic — the aesthetic is **sacred**.

---

## Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15 | React framework (App Router) |
| **React** | 19 | UI components |
| **TypeScript** | 5 | Type safety |
| **Prisma** | ORM | Database access |
| **Framer Motion** | Animations | CRT effects, transitions |

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, APY display, trust signals, how it works |
| `/vault` | Vault | Deposit/withdraw USDC, share balance, NAV |
| `/performance` | Performance | Equity curve, Sharpe, win rate, CLV |
| `/terminal` | MONOLITH Ops | Live engine dashboard (admin only) |
| `/predictions` | Predictions | Active model signals, upcoming events |
| `/faq` | FAQ | Investor questions |
| `/legal/*` | Legal | Terms, privacy, risk disclosures |

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
#   NEXT_PUBLIC_WS_URL=ws://localhost:8000
#   DATABASE_URL=postgresql://...

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
# Production build
npm run build

# Start production server
npm start

# Run tests
npx playwright test
```

## Design System

- **Theme**: Dark mode CRT terminal with green/cyan phosphor glow
- **Font**: Space Mono (monospace), Inter (body)
- **Effects**: CRT scanlines, holographic grid, glow animations
- **Colors**: Terminal green (#00FF41), cyan (#00FFFF), dark backgrounds

## License

Proprietary. All rights reserved.
