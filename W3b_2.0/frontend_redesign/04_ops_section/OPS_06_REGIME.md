# Ops Tab 6: REGIME

## The Objective
The Engine operates under specific "Regimes" (macro market conditions) that dictate how aggressive or defensive its Kelly Criterion bet sizing should be. This tab allows the operator to monitor and manually override the active regime.

## Visual Implementation Plan
1. **Regime Discriminator:**
   - A massive visual indicator showing the current identified market state: `TRENDING`, `MEAN-REVERTING`, `HIGH-VOLATILITY`, or `CHOP`.
2. **Parameter Overrides:**
   - Deeply technical sliders allowing the operator to adjust the `Base Kelly Multiplier`, `Volatility Dampener`, and `Max Edge Tolerance`.
   - **Extreme Danger Formatting:** Manual overrides in this section bypass engine safety protocols, so the components must be styled with stark caution colors (Orange/Red) to indicate structural risk.
3. **Historical Regime Shifts:**
   - A timeline of when the engine naturally shifted between regimes over the last 30 days and the PnL impact of those shifts.
