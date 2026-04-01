# Main Tab 1: Dashboard (The Command Center)

## The Objective
Eradicate all concepts of a "home page" or "betting slip". This is the **Command Center** for a sophisticated quantitative fund. When the user logs in, they should feel like they just sat down at an institutional Bloomberg Terminal that has been elegantly wrapped in an Apple frosted-glass aesthetic.

## Language & Nomenclature Shift
- **❌ BANNED RETAIL TERMS:** Bets, Slips, Wagers, Picks, Games, Matches, Odds, Parlays.
- **✅ REQUIRED INSTITUTIONAL TERMS:** Portfolio Velocity, Capital Allocation, Market Inefficiencies, Position Exposure, Yield Generation, Alpha, Event Contracts.

## Visual Implementation Plan
1. **The God-View PnL Header:** 
   - A massive, monospaced (Fira Code/JetBrains) dynamically updating aggregate PnL metric.
   - It doesn't just show "Balance", it shows "Total Asset Value (TAV)" and "24H Delta".
   - Flashes cyan on uptick, red on downtick.
2. **Live Market Ticker:**
   - A horizontally scrolling, institutional-grade ticker spanning the top or bottom of the screen.
   - Streams live Kalshi/Event probabilities and real-time W3B Engine sentiment (e.g., `NBA.LAL.SPREAD.CONVERGENCE +2.4%`).
3. **Exposure Map (3D Element):**
   - No pie charts. We use a floating WebGL Data Grid or Probability Mesh that visually responds to where our capital is deployed across different event categories.
4. **Glassmorphism Panels:**
   - System health, Engine status (e.g., "W3B Resolution Engine: ACTIVE"), and top 3 high-probability execution opportunities housed in deep, dark, semi-transparent `<InstitutionalGlass />` components.
