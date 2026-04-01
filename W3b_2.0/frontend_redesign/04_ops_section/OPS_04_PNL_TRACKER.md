# Ops Tab 4: 📊 P&L TRACKER

## The Objective
An unforgiving, granular, minute-by-minute ledger of profitability across all execution layers. This is not the smoothed-out "Vault" for investors; this is the raw accounting for the operator.

## Visual Implementation Plan
1. **Multi-Exchange Ledger:**
   - A tabular view showing balances segregated by exchange (e.g., Kalshi Balance, DraftKings Balance, Treasury Reserve).
2. **High-Resolution Yield Curves:**
   - Using Lightweight Charts to plot PnL down to the minute.
   - Toggle switches to view `Gross PnL`, `Net PnL (after fees/slippage)`, and `Unrealized PnL`.
3. **Attribution Analysis:**
   - A crucial table showing *where* the profit is coming from.
   - e.g., "NBA 2nd Quarter Spreads: +4.2%", "NFL Point Totals: -1.1%". This tells the operator exactly which models are thriving and which are bleeding.
