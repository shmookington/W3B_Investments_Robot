# Ops Tab 8: ALPHA

## The Objective
This is the core quantitative feedback loop. It measures how "right" the W3B Engine is. A model without measurable alpha is essentially gambling. This tab is strictly for scrutinizing calibration accuracy against closing line value (CLV) and Kalshi resolving lines.

## Visual Implementation Plan
1. **Closing Line Value (CLV) Chart:**
   - A vital graph for quants: did our engine beat the closing price? If we got in at 44% implied probability and it closed at 52%, we generated alpha regardless of the outcome.
2. **Model Decay Monitor:**
   - A visualization showing if a particular algorithm (e.g., NBA 4th Quarter Spreads) is losing its edge over time as the market gets smarter.
3. **Brier Score / Log Loss Module:**
   - Pure statistical scoring of the engine's probabilistic predictions, displayed in severe, high-contrast numbers inside `<InstitutionalGlass />` components.
