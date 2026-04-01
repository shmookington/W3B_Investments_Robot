# Main Tab 2: Markets (Event Contracts / The Slate)

## The Objective
Retail bettors look at "Games." Quant funds look at "Event Markets" and search for "Convergence Opportunites." This tab replaces the standard daily sports slate. It frames sports matches purely as volatile data structures traded on Kalshi. 

## Language & Nomenclature Shift
- **❌ BANNED RETAIL TERMS:** Slate, Matchups, Spreads (in retail sense), Moneyline, Over/Under.
- **✅ REQUIRED INSTITUTIONAL TERMS:** Event Contracts, Base Probabilities, Market Volatility, Projected Convergence, Binary Resolutions, Asymmetric Risk.

## Visual Implementation Plan
1. **The Data Table Matrix:**
   - No colorful team logos or player headshots. Event participants are treated as ticker symbols (e.g., `LAL/DEN-Q3-BINARY`).
   - A highly dense, sortable data table (built for desktop-first mentality, elegantly squashed for mobile).
   - Columns: `Contract ID`, `Market Consensus`, `W3B Engine Probability`, `Edge/Delta`, `Liquidity`.
2. **The 3D Obsidian Pillars Interface:**
   - As the user clicks on a specific Event Contract, the 3D Obsidian pillars in the background rotate and emit a faint gold glow, dynamically adjusting based on the specific contract's volatility metric.
3. **Deep Dive Overlay:**
   - Clicking a row does not open a "bet slip". It opens an "Execution Terminal" modal slide-out.
   - This modal displays the W3B Engine's real-time confidence intervals and historical backtest data for this exact market configuration before allowing the user to allocate capital.
