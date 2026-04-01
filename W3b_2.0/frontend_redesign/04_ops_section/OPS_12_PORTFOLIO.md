# Ops Tab 12: PORTFOLIO

## The Objective
Distinct from the public-facing Portfolio, the Ops Portfolio is an internal, merciless audit of capital efficiency. It breaks down exactly where the fund's liquidity is trapped and how much of it is unutilized (cash drag).

## Visual Implementation Plan
1. **Capital Efficiency Ratios:**
   - A stark visualization of `Deployed Capital` vs `Idle Capital`. For a quantitative engine, idle capital is wasted yield.
2. **Cross-Exchange Balance Management:**
   - Showing exact liquidity reserves required on Kalshi vs. Pinncale vs. internal treasury routing, and identifying if funds need to be manually swept from one account to another to support upcoming high-EV slate demands.
3. **Exposure by Asset Class:**
   - Not "how much did we bet on MLB", but "what percentage of the fund's Net Asset Value is currently relying on MLB Variance?"
