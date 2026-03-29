# Frontend Redesign Phase 7: Risk Management & Circuit Breakers

**Status:** APPROVED
**Topic:** The Risk Overlay (`/risk-management`)

## 1. The Strategy: Institutional Safety
Sophisticated LPs don't just care about yield; they care about maximum drawdown. A massive differentiator for W3B is our 14 independent circuit breakers. The frontend must have a dedicated view visualizing the health of these safety mechanisms in real-time.

## 2. Intricacies & Components

**1. `<CircuitBreakerPanel>`**
- A grid of 14 distinct indicators (e.g., `MAX_DRAWDOWN_24H`, `EXCHANGE_SPREAD_ABNORMALITY`, `API_LATENCY_SPIKE`).
- Visual state: Glowing platinum (Armed/Healthy), flashing muted gold (Warning), solid red (Tripped/Halted).

**2. `<ExposureHeatmap>`**
- A treemap or high-density grid showing exactly how much capital is deployed across different "Event Shares". 
- Ensures no single event holds >5% of the portfolio (Kelly Criterion bounds). 

**3. `<EmergencyKillSwitch>` (Admin/Ops Only)**
- A highly tactile, explicitly designed "Halt Trading" mechanism requiring 2FA. Liquidates all active (hedged) shares back to base currency to protect capital.
