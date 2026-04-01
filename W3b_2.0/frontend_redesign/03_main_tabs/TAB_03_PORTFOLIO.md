# Main Tab 3: Portfolio (Active Positions & Exposure)

## The Objective
This replaces the "Active Bets" or "My Action" page. To a quant, this is their open risk exposure. It must visualize how much capital is locked in unresolved events and mathematically project the outcomes based on real-time data ingestion.

## Language & Nomenclature Shift
- **❌ BANNED RETAIL TERMS:** Open Bets, Cash Out, Pending, Results.
- **✅ REQUIRED INSTITUTIONAL TERMS:** Active Positions, Capital Exposure, Unrealized PnL, Hedging Opportunities, Resolution Pending, Expected Value (EV).

## Visual Implementation Plan
1. **The Exposure Heatmap:**
   - A visual representation (potentially using our floating WebGL particles) of how correlated our current positions are. If we are highly over-exposed to one specific event outcome, the UI reflects this tension with a pulsing orange/red gradient in the glass panels.
2. **Live Resolution Tracking:**
   - As an event is actively occurring (e.g., an NBA game in the 4th quarter), the position status changes from "Idling" to "Active Resolution". 
   - Uses progress bars with highly technical, monospaced percentages to show the real-time probability of the position resolving in the money.
3. **Dynamic Hedging Actions:**
   - Instead of a "Cash Out" button, we offer an `[ EXECUTE HEDGE ]` button that dynamically calculates the exact counter-position needed on Kalshi to lock in a guaranteed minimal-risk yield.
