# Frontend Redesign Phase 6: The Immutable Track Record

**Status:** APPROVED
**Topic:** Institutional Performance Verification (`/track-record`)

## 1. The Strategy: The Audit Log
Unlike standard betting records displaying "Slips" or "Parlays", a sophisticated quantitative fund provides an "Audit Log" or "Performance History". Trust is paramount; the design must convey transparency, algorithmic accountability, and mathematical precision.

### Core Redesign Tenets:
1. **The Ledger Aesthetic:** Tight spacing, very low brightness contrast (e.g., `#a1a1aa` text on `#111114` backgrounds). Alternating row subtle highlighting.
2. **"Volatility" over "Wins":** Instead of a binary W/L column, use `SETTLED +$142` or `YIELD: 4.5%`.
3. **Data Density:** Show closing line value (CLV), edge percentage, and exact Unix execution timestamps.

## 2. Component Structure Breakdown

**1. `<VerificationRibbon>`**
- A banner confirming: `Data validated against CFTC-regulated DCM feeds.`

**2. `<AuditLogTable>`**
- **DATE (UTC):** `2026-03-24 14:02:00`
- **TICKER:** `EVT-NBA-04X`
- **POSITION:** `SHORT SPREAD @ 0.45`
- **CLV MULTIPLIER:** `1.04x` (Proves the algorithm beat the closing market)
- **SETTLEMENT:** `[ACHIEVED +55% YIELD]`

**3. `<PerformanceChart_Advanced>` (Expansion on the Landing Page)**
- A deep-dive D3 graph allowing the user to scrub over time, visualizing drawdowns, Sharpe ratios, and standard deviations. 

## 3. Workflow Implementation
1. This route replaces the traditional "History" tab.
2. Ensure the "Export to CSV" mechanism is beautifully styled using the Onyx/Platinum aesthetic.

## Next Steps
- Implement `AuditLog.tsx`.
- Connect to the `GET /api/signals/history` endpoint from `alpha.py`.
- Style the Table rows with standard `<InstitutionalGlass>` borders.
