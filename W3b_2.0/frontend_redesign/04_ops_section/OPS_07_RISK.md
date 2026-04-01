# Ops Tab 7: RISK

## The Objective
The single most important page for the fund manager. It monitors catastrophic downside metrics and prevents the engine from "blowing up" the account.

## Visual Implementation Plan
1. **Value At Risk (VaR):**
   - Extremely prominent display of current VaR. "If all current probabilities invert, what is maximum capital loss?"
2. **Exposure Limits:**
   - Visualizing the concentration risk. If 40% of our portfolio relies on the Lakers winning, the screen flashes red warnings for `CORRELATION DANGER`.
3. **The Kill Switch:**
   - The absolute center of the page. A beautifully designed, intimidatingly serious `[ LIQUIDATE ALL & HALT ENGINE ]` button. Built using Framer Motion to require a 3-second long-press to activate to prevent misclicks.
