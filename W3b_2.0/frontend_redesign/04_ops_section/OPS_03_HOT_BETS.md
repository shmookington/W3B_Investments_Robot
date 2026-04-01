# Ops Tab 3: 🔥 HOT BETS (Priority Executions)

## The Objective
Internally, we can call them "Hot Bets," but the UI will treat them as "Priority Executions" or "High-Conviction Vectors." This is an isolated feed of the absolute highest Expected Value (EV) discrepancies found by the engine right now.

## Visual Implementation Plan
1. **The Alpha Queue:**
   - A vertically stacked feed of cards. Each card represents a severe market mispricing.
   - Highlights the `Base Concept`, the `Kalshi Probability`, and the `W3B Alpha Delta` (how wrong the market is).
   - **Color Coding:** The wider the gap between the public market and our engine, the brighter the card glows (Gold for 5%+ edge, Red for 10%+ edge).
2. **Manual Override Buttons:**
   - Every "Hot Bet" must have a highly visible `[ FORCE EXECUTE ]` button for the operator to immediately capitalize if the automated executor has been paused.
