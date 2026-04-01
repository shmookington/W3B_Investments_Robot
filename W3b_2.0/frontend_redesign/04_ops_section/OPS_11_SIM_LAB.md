# Ops Tab 11: SIM LAB

## The Objective
The sandbox. Before a new predictive model, regime adjustment, or Kelly parameter goes live and risks real capital, it must be run through the Sim Lab to backtest against historical data.

## Visual Implementation Plan
1. **Backtesting Configuration Panel:**
   - Deeply granular form inputs allowing the operator to select historical timestamps, apply a new strategy logic, and configure virtual capital.
2. **The "Shadow Engine" Output:**
   - While the main engine handles real money, the shadow engine spits out what the PnL *would have been* under the new logic. 
3. **Comparison Overlay:**
   - Superimposing the Shadow PnL curve over the Live PnL curve to visually confirm if the new model is actually an improvement.
