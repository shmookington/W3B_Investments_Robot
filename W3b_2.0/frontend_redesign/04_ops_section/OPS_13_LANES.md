# Ops Tab 13: LANES

## The Objective
"Lanes" determine the specific algorithmic execution pathways or "strategies" the Engine is currently authorized to trade (e.g., `Lane Alpha: NBA 4Q Under` or `Lane Beta: Cross-Exchange Arbitrage`). This tab is the routing switchboard.

## Visual Implementation Plan
1. **Lane Authorization Switches:**
   - Massive, tactile toggle switches (Framer Motion / Apple Control Center style) allowing the operator to instantly kill a specific Lane if that particular model is bleeding, without shutting down the entire engine.
2. **Lane Profitability Matrix:**
   - A side-by-side comparison of which execution lanes are carrying the fund and which are dragging.
3. **Bandwidth / Capital Allocation per Lane:**
   - Sliders giving the operator manual control to throttle capital flowing into a specific lane (e.g., capping Lane B to a maximum 10% portfolio drawdown).
