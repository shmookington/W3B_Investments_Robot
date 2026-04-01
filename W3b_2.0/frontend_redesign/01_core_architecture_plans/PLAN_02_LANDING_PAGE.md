# Frontend Redesign Phase 2: Landing Page Re-Architecture

**Status:** APPROVED
**Topic:** Rebuilding the Public-Facing Home Page (`page.tsx`)

## 1. The Strategy: Institutional Authority
The current landing page uses a gaming/betting narrative. We must re-architect the entire DOM tree of `page.tsx` from scratch so that an visitor feels they have stumbled into a high-barrier-to-entry liquidity provider.

### Core Redesign Tenets:
1. **Minimize the visible copy:** High-end hedge funds (like Renaissance Technologies or Citadel Securities) don't explain how a limit order works. They speak in broad terms of "Liquidity", "Execution", "Alpha", and "Systematic Hedging".
2. **Prominent Data Visually:** The live performance curve (Equity Chart) should be front and center, styled exquisitely with deep onyx and muted gold tracking lines.
3. **Typography over Images:** Zero stock photos. Zero 3D cartoon graphics. Just beautifully kerned typography against shifting, abyssal-dark backgrounds.

## 2. Component Structure Breakdown

**1. Primary Hero Section (`<InstitutionalHero />`)**
- **Headline:** `Algorithmic Liquidity Provision.`
- **Subheadline:** `We trade live event shares and execute volatility arbitrage to generate verified yield.`
- **Action:** A single `<ExecutionButton>` titled `DEPLOY CAPITAL` or `ENTER VAULT`.

**2. The Live Arbitrage Ticker (`<RegimePulse />`)**
- A horizontal ribbon of numbers rolling beneath the hero. It simulates live "Event Shares" mispricings. 
- Example: `EVT-739X // SPREAD: 0.04c // EXPECTED YIELD: 4.2% [LIVE]`

**3. The Three Tenets (Replacing "How it Works")**
- Instead of "Invest, Predict, Verify", the flow is:
  - **SYSTEMATIC ACQUISITION:** We identify probability dislocations in event contracts.
  - **VOLATILITY HEDGING:** We deploy capital across uncorrelated books to stabilize delta.
  - **YIELD GENERATION:** Convergence yields verified, non-correlated returns.

**4. The Vault Performance Section (`<EquityDepthChart />`)**
- A high-fidelity D3 or Recharts component plotting the actual historical fund returns.
- Styling: Line color is platinum (`#f4f4f5`), area under curve is a gradient of gold fading to `rgba(0,0,0,0)`.

**5. Vault Security Protocol**
- "CFTC-Regulated Exchange"
- "Fractional Kelly Sizing"
- "On-Chain Audit Trails"
- High-level, low-jargon. 

## Next Steps
- Wipe `src/app/page.tsx` clean.
- Implement the `<InstitutionalHero>` and `<EquityDepthChart>` sections.
- Ensure the animation on hover feels "heavy" and deliberate (spring constraints).
