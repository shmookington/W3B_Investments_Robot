# Frontend Redesign Phase 10: The Quant Analytics Desk

**Status:** APPROVED
**Topic:** Visualizing the True Math Behind the Fund (`/analytics`)

## 1. The Strategy: Complete Quantitative Transparency
Most sports betting algorithms hide their math because it's bad. W3B is a proper algorithmic liquidity protocol. The frontend must have an entire deeply nested section where LPs can view the actual *Brier Scores*, *Calibration Curves*, and *Historical CLV (Closing Line Value) Drift*.

## 2. Intricacies & Components

**1. `<BrierCalibrationPlot>`**
- A 45-degree scatterplot using Recharts. If our `markov.py` and `elo_model.py` predict an event has a 62% chance of occurring, does it actually occur 62% of the time historically?
- Shows the difference between "Model Expectation" and "Realized Reality".

**2. `<SubModelLeaderboard>`**
- We run ensembles. Some models decay. This component displays the active weighting of the current ensemble. 
- Example: `Dynamic Elo (65% Weight)`, `Markov Regimes (20% Weight)`, `Rest Fatigue (15% Weight)`. 
- When a sub-model performs poorly, its weight drops automatically in the backend. This component must visually flash or re-order these lists in real time to show the fund adapting.

**3. `<CLV_DriftGauge>`**
- A dial charting Closing Line Value. When W3B acquires an event share at $0.45, and it closes at $0.52... we just generated +$0.07 of CLV. This proves the algorithm has an edge. This metric should be heavily bolded in Platinum.
