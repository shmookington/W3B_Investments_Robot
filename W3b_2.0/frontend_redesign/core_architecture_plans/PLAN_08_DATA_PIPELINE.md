# Frontend Redesign Phase 8: Data Pipeline Integrity HUD

**Status:** APPROVED
**Topic:** Visualizing the Back-End Ingestion (`/data-integrity`)

## 1. The Strategy: Exposing "The Oracle"
High-frequency funds live and die by exactly one thing: execution latency and data integrity (GIGO). We just built `nba_validation.py` and the `/api/data/health` root. The frontend requires a specific, hyper-detailed diagnostic page that proves to LPs that the data generating their yield is flawless.

## 2. Intricacies & Components

**1. `<IngestionPipelineTree>`**
- A node-based flow visually tracking data from Provider (ESPN/BDL), to Reconciler, to the Monolith Database, to the Prediction Engine. 
- Lines pulse `<Data-Positive>` when packets arrive and hit consensus.

**2. `<AnomalousDataLog>`**
- A terminal-style tail-log mapping to the reconciliation mismatches. 
- e.g., `WARN: Cross-source verification failed for Ticker [EVT-039X]. Score suspended until tertiary consensus.`

**3. `<LatencyPingHUD>`**
- Rolling sparklines monitoring the round-trip latency (in milliseconds) of our API hooks and the Kalshi Orderbook WebSockets. If latency exceeds 200ms, trade execution is paused automatically.
