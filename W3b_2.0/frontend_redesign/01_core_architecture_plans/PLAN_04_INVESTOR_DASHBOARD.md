# Frontend Redesign Phase 4: The Investor Dashboard

**Status:** APPROVED
**Topic:** The Logged-In User Experience (`/dashboard`)

## 1. The Strategy: "Portfolio Management"
Once an LP (Liquidity Provider) logs in, they should not see "Your Bets". They should see **"Your Vault"**, **"Current Holdings"**, and **"Delta Exposure"**. The user is now inside the fund.

### Core Redesign Tenets:
1. **The Terminal Layout:** Split panes. Fixed heights. Dense data grids. Dark-mode aesthetics mimicking professional execution terminals.
2. **Key Metric Dominance:** A large `<Platinum>` number representing Portfolio Value ($X,XXX.XX) at top left. Next to it, secondary stats like 24h PnL, Total Return (%), and Sharpe Ratio.
3. **The "Shares" Grid:** Instead of a betting ticket, it's a `<HoldingsGrid>` displaying specific Event Contracts (e.g., `NBA-LAL-BOS-2605`) as individual assets.

## 2. Component Structure Breakdown

**1. `<PortfolioStatRibbon>`**
- Contains exactly 4 monolithic numbers describing the user's allocated capital and fractional profits from the W3B fund.
- E.g., `CAPITAL DEPLOYED: $4,500.00 | REALIZED PNL: +$342.10 | UNREALIZED: +$12.50`

**2. `<HoldingsGrid>`**
- A high-density data table containing currently held probability "shares" on live games.
- Columns: 
  - `TICKER` (e.g., NBA-DEN-LAL)
  - `SHARE CLASS` (e.g., `YES` / `HOME_WIN`)
  - `QTY` (e.g., 450)
  - `ENTRY PRICE` (e.g., $0.45)
  - `MARKET PRICE` (e.g., $0.62)
  - `UNREALIZED PnL` (e.g., +$76.50)

**3. `<AlgorithmicHedgingToggle>`**
- An interactive component that lets users "Autopilot" their funds, giving control to the Monolith engine to size positions and hedge automatically. This reinforces the "quant fund" narrative.

## Next Steps
- Implement `DashboardLayout.tsx` prioritizing deep vertical space (like a Bloomberg screen).
- Refactor the existing GraphQL/REST pulls into the `HoldingsGrid`.
