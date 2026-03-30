# Phase 33: The Vercel Connection (FastAPI Router)

You have a pristine Holographic CRT-Style Web Dashboard. However, right now the Dashboard reads zero data as the AI backend operates solely inside the Python Terminal. Phase 33 connects the Web server (`W3B Web App`) to the Backend Machine (`Monolith`).

## Objective
The `api_router.py` script bridges the Python Intelligence layer with the Typescript GUI Layer via a blazingly fast `FastAPI` endpoint suite.

## Implementation Details

### 1. The Real-Time Endpoint Generation
The server must explicitly generate the JSON schema Vercel relies on to populate the UI.
- `GET /api/engine/signals`: Pulls the active execution tickets (`[Boston, 85%, +4% Edge, $60.00 Risk, HIGH CONFIDENCE]`).
- `GET /api/engine/status`: Pulls the Cron Job System Health (`"Scraping ESPN... Memory Normal. XGBoost Online."`).
- `GET /api/engine/factors`: Pulls the 30-team Crowded Factor list.
- `GET /api/engine/reflexivity`: Pulls the media cycle (Overhyped vs Underhyped metrics).

### 2. The Bankroll Exposer
- `GET /api/engine/risk`: Pushes the current Bankroll Size, Kelly Value at Risk (VaR), and GARCH Volatility index to the frontend meters.

## Verification
- Spin up `uvicorn monolith.api.api_router:app --reload` locally. Execute a standard HTTP query from Postman or CURL. Ensure the `/signals` endpoint dumps out the pure JSON format of all 29 mathematical phases within <200 milliseconds.
