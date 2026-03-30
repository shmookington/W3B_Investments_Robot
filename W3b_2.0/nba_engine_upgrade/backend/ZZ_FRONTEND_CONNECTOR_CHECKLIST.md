# NBA Engine Upgrade — Frontend / Connector Checklist
### *Making Sure Every Ounce of Backend Intelligence Reaches the User*

> This checklist verifies that all 28 phases of backend prediction intelligence are properly wired to the frontend via API routes, correctly rendered in UI components, and display real data (not stale/mock values).

---

## Section 1: API Route Verification

> Every backend model must expose its output via an API route that the frontend can call. These routes live in `frontend/src/app/api/`.

### 1.1 — Core Prediction API
- [ ] `GET /api/engine/proxy` returns upgraded predictions (not old static Elo)
- [ ] Response includes `dynamic_elo_rating` (Phase 1) for both teams
- [ ] Response includes `injury_adjustment` (Phase 2) when injuries exist
- [ ] Response includes `fatigue_adjustment` (Phase 2) for B2B games
- [ ] Response includes `momentum_score` (Phase 2) for both teams
- [ ] Response includes `model_probability` from the blended/meta-learner output
- [ ] Response includes `market_probability` from live odds
- [ ] Response includes `edge_pct` (model_prob - market_prob)
- [ ] Response includes `confidence_tier` (LOW / MEDIUM / HIGH / EXTREME)
- [ ] Response includes `recommended_bet_size` (dollars + units from Kelly/PPO)
- [ ] Response includes `recommended_book` (best line from Phase 18)
- [ ] Response includes `bet_timing` (DQN recommendation from Phase 13)
- [ ] Response latency is < 500ms under normal load
- [ ] Response returns valid JSON with no null fields on game-day

### 1.2 — Markov / Regime API (Phase 2.5)
- [ ] `GET /api/engine/proxy` includes `hmm_regime_state` per team
- [ ] Regime states are human-readable: "HOT", "COLD", "NEUTRAL", "TRANSITION"
- [ ] Response includes `regime_transition_flag` (boolean)
- [ ] Response includes `bayesian_uncertainty` (std dev) for uncertainty display
- [ ] For live games: response includes `live_chain_probability` (Phase 2.5.3/2.5.8)

### 1.3 — Market Intelligence API (Phase 5)
- [ ] Response includes `opening_line` and `current_line`
- [ ] Response includes `line_movement_magnitude` (how much the line moved)
- [ ] Response includes `sharp_action_detected` (boolean)
- [ ] Response includes `reverse_line_movement` (boolean)
- [ ] Response includes `steam_move_active` (boolean)
- [ ] After game resolves: `clv_cents` is populated in historical data
- [ ] Response includes `public_bet_pct` (for Phase 28 contrarian signals)

### 1.4 — Signal Feed API
- [ ] `GET /api/insights` returns tonight's active signals
- [ ] Each signal includes: `event_id`, `side`, `edge`, `confidence`, `recommended_action`
- [ ] Signals are sorted by edge (highest first)
- [ ] Signal count matches what the backend generates (no lost signals)
- [ ] Signals include `signal_type` (pre-game / live / contrarian)

### 1.5 — New API Routes Needed
- [ ] `GET /api/engine/model-health` → Phase 23 model health data
- [ ] `GET /api/engine/pnl` → Phase 23 P&L summary
- [ ] `GET /api/engine/system-status` → Phase 23 system health
- [ ] `GET /api/engine/factors` → Phase 27 factor scores per team
- [ ] `GET /api/engine/perception` → Phase 28 perception gap per team
- [ ] `GET /api/engine/decision-journal` → Phase 26 recent decisions
- [ ] `GET /api/engine/causal-audit` → Phase 21 feature causality classifications
- [ ] `GET /api/engine/config` → current config.yaml values (for settings page)
- [ ] `POST /api/engine/config` → update config.yaml values (admin only)
- [ ] `GET /api/engine/signals/history` → historical signals with outcomes
- [ ] All new routes authenticated (admin only)
- [ ] All new routes return JSON within 1 second
- [ ] All new routes have CORS configured for Vercel domain only

---

## Section 2: NBA Game Cards (Primary Display)

> **Page:** `frontend/src/app/monolith/sports/nba/page.tsx`
> This is the main page users see. Game cards must display enriched prediction data.

### 2.1 — Core Prediction Display
- [ ] Win probability shown as percentage (e.g., "68.2%")
- [ ] Win probability bar is visually proportional (not just text)
- [ ] Edge percentage shown when edge > 2% (e.g., "+6.2% edge")
- [ ] Confidence badge displayed: LOW (gray), MEDIUM (yellow), HIGH (green), EXTREME (gold)
- [ ] Predicted spread shown alongside model probability
- [ ] Moneyline shown in American odds format

### 2.2 — Dynamic Elo Display (Phase 1)
- [ ] Team Elo rating shown on each game card (or available on hover/expand)
- [ ] Elo delta shown (e.g., "↑ 15 pts in last 30 days")
- [ ] Home court Elo adjustment displayed (e.g., "+72 HCA")

### 2.3 — Live Context Indicators (Phase 2)
- [ ] Injury icon appears when significant injuries exist
- [ ] Injury tooltip/panel shows: player name, status, Elo impact
- [ ] "B2B" badge shown for back-to-back teams
- [ ] Rest advantage indicator (e.g., "Rest ▲ +2 days")
- [ ] Momentum indicator (e.g., "🔥 8-2 L10" or "❄️ 2-8 L10")

### 2.4 — Regime State Display (Phase 2.5)
- [ ] Regime badge shown per team: HOT (🟢), NEUTRAL (🟡), COLD (🔴), TRANSITION (⚡)
- [ ] Regime badge updates after each game resolves
- [ ] Tooltip explains what the regime state means

### 2.5 — Market Intelligence Indicators (Phase 5)
- [ ] Sharp action indicator (⚡ icon) when sharp money detected
- [ ] Reverse line movement indicator (↕️) when RLM present
- [ ] Steam move alert (🚨) displayed prominently
- [ ] Line movement direction arrow (↑ or ↓) next to current spread
- [ ] Public bet percentage bar when available (e.g., "72% public on BOS")

### 2.6 — Alternative Data Display (Phase 14)
- [ ] Referee crew names shown (when available, day-of-game)
- [ ] Ref tendency indicator (high-foul 🟡 / normal 🟢)
- [ ] Travel/altitude flag when significant (e.g., "⛰️ Denver altitude penalty")
- [ ] Schedule spot flag (e.g., "⚠️ B2B 4-in-5" or "🏖️ Pre All-Star")

### 2.7 — Factor Scores (Phase 27)
- [ ] Composite factor score shown (or available on card expand)
- [ ] Individual factors available on detail view (value, momentum, quality, carry)
- [ ] Factor crowding warning when a factor is over-exploited

### 2.8 — Contrarian / Narrative Signals (Phase 28)
- [ ] Contrarian signal badge (🔄) when active
- [ ] Narrative archetype label (e.g., "Trade deadline hype ⚠️")
- [ ] Perception gap indicator (OVERHYPED / UNDERHYPED)

### 2.9 — H2H & Situational Display (Phase 4)
- [ ] Head-to-head record shown (e.g., "BOS 5-1 vs NYK last 3 yrs")
- [ ] Situational spot flag: revenge game (🔁), letdown (⬇️), look-ahead (👀)
- [ ] Division rivalry indicator when applicable

### 2.10 — Bayesian Uncertainty (Phase 11)
- [ ] Uncertainty band shown on win probability (e.g., "68% ± 4%")
- [ ] High-uncertainty games flagged with ❓ badge (reduce sizing)

### 2.11 — Live Game Enhancements
- [ ] Live score updates (already implemented — verify still working)
- [ ] Live Markov chain probability updates during game (Phase 2.5.3/2.5.8)
- [ ] Live hedging recommendation when position has improved (Phase 19)
- [ ] Win probability chart that updates quarter-by-quarter

---

## Section 3: Regime Page

> **Page:** `frontend/src/app/monolith/regime/page.tsx`

### 3.1 — Regime Dashboard
- [ ] All 30 teams displayed with current HMM regime state
- [ ] Regime history timeline (last 20 games per team)
- [ ] Regime transition alerts highlighted
- [ ] Filter by: regime state (HOT/COLD/NEUTRAL/TRANSITION)
- [ ] Regime-based signal recommendations

---

## Section 4: P&L Page

> **Page:** `frontend/src/app/monolith/pnl/page.tsx`

### 4.1 — P&L Display
- [ ] Daily / weekly / monthly / season P&L summary (Phase 23)
- [ ] Equity curve chart (cumulative P&L over time)
- [ ] Win rate displayed
- [ ] Average CLV displayed (the #1 professional metric)
- [ ] ROI percentage displayed
- [ ] Sharpe ratio displayed
- [ ] Max drawdown period highlighted
- [ ] P&L breakdown by confidence tier (HIGH vs MEDIUM vs LOW)
- [ ] P&L breakdown by signal type (pre-game, live, contrarian)
- [ ] P&L breakdown by book (when multi-book active)

---

## Section 5: Risk Page

> **Page:** `frontend/src/app/monolith/risk/page.tsx`

### 5.1 — Risk Metrics
- [ ] Current bankroll displayed
- [ ] Kelly utilization percentage (Phase 24)
- [ ] Portfolio exposure (% of bankroll at risk tonight) (Phase 19)
- [ ] Correlation risk indicator (Phase 19)
- [ ] VaR (Value at Risk) — 95% confidence worst-case tonight
- [ ] Max drawdown alert threshold
- [ ] Model decay status (Phase 17) — green/yellow/red
- [ ] Active signals count with total exposure
- [ ] GARCH volatility regime per team (Phase 25) — HIGH/NORMAL/LOW
- [ ] Information ratio trend line (Phase 24)

---

## Section 6: Portfolio Page

> **Page:** `frontend/src/app/monolith/portfolio/page.tsx`

### 6.1 — Portfolio Optimization Display
- [ ] Tonight's optimized allocation shown (Phase 19)
- [ ] Correlation matrix heatmap for tonight's bets
- [ ] Diversification ratio displayed
- [ ] Expected portfolio EV for tonight
- [ ] Historical portfolio performance vs naive (equal-weight) betting

---

## Section 7: Execution Page

> **Page:** `frontend/src/app/monolith/execution/page.tsx`

### 7.1 — Multi-Book Display
- [ ] Best available line across all books shown per signal (Phase 18)
- [ ] Account health status per book (green/yellow/red)
- [ ] Order fragmentation plan displayed (which book gets how much)
- [ ] DQN bet timing recommendation shown (Phase 13)
- [ ] Bet placement status (placed / waiting / skipped)

---

## Section 8: Dashboard Page

> **Page:** `frontend/src/app/monolith/sports/page.tsx` and `frontend/src/app/dashboard/page.tsx`

### 8.1 — Operations Dashboard (Phase 23)
- [ ] Model health panel — Brier score for each sub-model, status badges
- [ ] System status panel — API latency, data staleness, DB status
- [ ] Tonight's signal feed — real-time active signals
- [ ] Recent alert log — last 24h of system alerts
- [ ] Quick stats: signals today, win rate this week, CLV trend

---

## Section 8.5: Backtest Page

> **Page:** `frontend/src/app/monolith/backtest/page.tsx`

### 8.5.1 — Backtest Results Display
- [ ] Walk-forward backtest results shown (Phase 7)
- [ ] Season-by-season ROI table
- [ ] Equity curve for each backtested season
- [ ] Monte Carlo simulation results: probability of ruin, 95% CI
- [ ] Feature importance ranking from XGBoost (Phase 6)
- [ ] Calibration curve (predicted probability vs actual win rate)

---

## Section 9: Decision Journal Viewer (Phase 26 — NEW)

### 9.1 — Journal UI
- [ ] Add new page or tab: `/monolith/journal` or tab on dashboard
- [ ] List recent decisions with pre-mortem reasoning
- [ ] Post-mortem quadrant displayed per bet (Skilled / Bad Luck / Good Luck / Mistake)
- [ ] Weekly review summary card
- [ ] Believability scores per model shown in a bar chart
- [ ] Filter by: quadrant, date range, confidence tier

---

## Section 10: Factor Dashboard (Phase 27 — NEW)

### 10.1 — Factor UI
- [ ] Add factor scores tab to `/monolith/sports/nba/`
- [ ] 30-team table sorted by composite factor score
- [ ] Individual factor columns (Value, Momentum, Quality, Carry, Low Vol, Size)
- [ ] Factor crowding warnings highlighted in red
- [ ] Seasonal factor strength indicator (which factors are "in season" right now)
- [ ] Factor performance history (which factors had positive ROI last month)

---

## Section 11: Terminal / Command Bar

> **Components:** `frontend/src/components/monolith/CommandBar.tsx`, `TerminalGrid.tsx`

### 11.1 — Command Bar Integration
- [ ] Search includes prediction data (search "Celtics" shows tonight's edge)
- [ ] Command bar accepts `/status`, `/pnl`, `/signals` shortcuts
- [ ] Quick-action buttons for pausing/resuming signal generation (admin only)

### 11.2 — Terminal Grid
- [ ] Terminal windows can display live model output
- [ ] Real-time signal feed terminal available
- [ ] System log terminal available (Phase 23 alerts)

---

## Section 12: Alert Banner

> **Component:** `frontend/src/components/monolith/AlertBanner.tsx`

### 12.1 — Alert Integration
- [ ] Model drift alert shows when Phase 17 detects drift
- [ ] Steam move alert shows across top of page
- [ ] Account limit warning shows when Phase 18 detects limit risk
- [ ] Contrarian opportunity alert when Phase 28 signal fires
- [ ] System down alert when any API feed fails
- [ ] Paper trading mode banner (yellow, persistent across all pages when ON)
- [ ] Emergency stop confirmation shows after /stop is triggered

---

## Section 13: Data Flow Verification

### 13.1 — End-to-End Data Flow
- [ ] **VPS → Vercel:** Prediction API returns fresh data (not cached > 5 min)
- [ ] **VPS → Vercel:** WebSocket/SSE stream delivers live updates during games
- [ ] **VPS → Telegram:** Signal alerts fire within 30 seconds of generation
- [ ] **VPS → Telegram:** /status command returns within 5 seconds
- [ ] **VPS → PostgreSQL:** All game results stored within 30 min of game end
- [ ] **Vercel → VPS:** Engine control commands (pause/resume) work from frontend

### 13.2 — Error Handling
- [ ] Frontend shows "No predictions available" gracefully when API is down
- [ ] Frontend shows "Data loading..." skeleton while API responds
- [ ] Frontend retries failed API calls (3 attempts, 2s backoff)
- [ ] Frontend shows stale-data warning when API data > 15 min old
- [ ] No unhandled JavaScript errors in browser console during normal operation

### 13.3 — Mobile Responsiveness
- [ ] NBA game cards render correctly on mobile (< 480px)
- [ ] P&L page is scrollable and readable on mobile
- [ ] Dashboard panels stack vertically on mobile
- [ ] Telegram remains primary mobile interface (dashboard is desktop bonus)

---

## Section 14: Performance Verification

### 14.1 — Load Times
- [ ] NBA page initial load < 2 seconds
- [ ] Dashboard page initial load < 3 seconds
- [ ] API responses < 500ms on average
- [ ] No visible layout shift on page load (CLS < 0.1)
- [ ] WebSocket reconnects automatically after disconnect

### 14.2 — Data Freshness
- [ ] Predictions update within 5 minutes of new data arriving on VPS
- [ ] Live game scores update within 30 seconds (existing — verify still works)
- [ ] Injury data reflects latest official report (published 5 PM ET)
- [ ] Referee crew data appears on game day (assigned ~9 AM)
- [ ] Line movement data updates every 10 minutes on game days

---

## Section 15: Smoke Test Sequence

> Run this sequence on a regular game night to verify everything works:

- [ ] **T-6 hours:** Check NBA page loads with tonight's games
- [ ] **T-4 hours:** Verify Elo ratings updated from last night's results
- [ ] **T-3 hours:** Confirm injury report data is current
- [ ] **T-2 hours:** Check signals generated for tonight's games
- [ ] **T-1 hour:** Verify referee data appears on game cards
- [ ] **T-30 min:** Confirm lineup-based adjustments fire after lineups announced
- [ ] **T-0 (tip):** Live scores begin updating
- [ ] **During game:** Live Markov probability updates if live signals active
- [ ] **Post-game:** Results ingested; Elo updated; CLV calculated
- [ ] **Post-game:** Decision journal post-mortem generated
- [ ] **Post-game:** Model health metrics recalculated
- [ ] **Next morning:** Check Telegram /status returns healthy

---

## Section 16: Settings & Configuration UI

> **Page:** `frontend/src/app/settings/page.tsx` (existing — needs engine config panel)
> 
> These settings control the pipeline behavior. Without this, you'd have to SSH into the VPS to change a threshold.

### 16.1 — Bankroll & Sizing Settings
- [ ] Bankroll input field (total capital allocated to NBA betting)
- [ ] Kelly multiplier slider (0.10 to 1.00, default 0.35)
- [ ] Max single-bet exposure field (default 5% of bankroll)
- [ ] Max nightly exposure field (default 15% of bankroll)
- [ ] Changes save to `config.yaml` on VPS via `POST /api/engine/control`
- [ ] Current values display on load (pulled from VPS config)

### 16.2 — Signal Thresholds
- [ ] Minimum edge threshold slider (default 3%)
- [ ] Max signals per night cap (default 5)
- [ ] Confidence tier thresholds (LOW/MED/HIGH/EXTREME cutoff percentages)
- [ ] Paper trading mode toggle (BIG RED SWITCH — prominently displayed)
- [ ] Paper trading mode shows warning banner across all pages when ON

### 16.3 — Phase Toggle Panel
- [ ] List of all 28 phases with enable/disable toggles
- [ ] Disabled phases shown in gray with "(OFF)" label
- [ ] Warning when disabling a critical phase (1, 2, 12)
- [ ] Phase dependency warnings (e.g., "Disabling Phase 6 will also disable Phase 21")
- [ ] Changes take effect on next pipeline run (not retroactive)

### 16.4 — Notification Preferences
- [ ] Toggle: Telegram signal alerts ON/OFF
- [ ] Toggle: Telegram weekly review ON/OFF
- [ ] Toggle: Telegram system alerts ON/OFF
- [ ] Toggle: Steam move alerts ON/OFF
- [ ] Minimum confidence to alert (e.g., only alert for HIGH+ signals)

---

## Section 17: Signal Review & Approval Flow

> When a bet signal is generated, verify the full lifecycle is visible and controllable.

### 17.1 — Signal Generation → Display
- [ ] Signal generated by VPS pipeline appears in `/api/insights` within 30 seconds
- [ ] Signal appears on NBA page game card immediately
- [ ] Signal appears in Telegram within 30 seconds
- [ ] Signal details are complete: side, probability, edge, confidence, sizing, timing

### 17.2 — Signal Detail View
- [ ] Clicking a signal on the NBA page opens a detail panel showing:
  - Model probability vs market probability (visual comparison)
  - Which models agree/disagree (Phase 21 meta-learner output)
  - Edge source breakdown (e.g., "Primary edge: injury impact +4.2%")
  - Pre-mortem risk factors (Phase 26)
  - Recommended bet size (dollars + units)
  - Recommended book (best line from Phase 18)
  - DQN timing recommendation ("Place in 45 min" or "Place now")
  - Factor scores for both teams (Phase 27)
  - Regime states for both teams (Phase 2.5)
- [ ] Detail panel loads in < 1 second

### 17.3 — Signal Lifecycle Tracking
- [ ] Signal status progression visible: GENERATED → ACTIVE → PLACED → RESOLVED
- [ ] For paper trading: status goes GENERATED → ACTIVE → RESOLVED (no PLACED)
- [ ] Resolved signals show: WON/LOST, P&L, CLV, post-mortem quadrant
- [ ] Historical signals searchable by date, team, confidence, outcome

---

## Section 18: API Contract Validation

> The backend pipeline produces a specific JSON schema. The frontend must consume it exactly. Mismatches cause silent failures.

### 18.1 — Schema Alignment
- [ ] Backend signal output schema documented in `monolith/pipeline/schemas.py`
- [ ] Frontend TypeScript types match backend schema in `frontend/src/types/`
- [ ] All fields have matching names and types (no frontend expecting `win_prob` while backend sends `model_probability`)
- [ ] Nullable fields handled: frontend has fallback for every optional field
- [ ] Date formats consistent: backend and frontend both use ISO 8601

### 18.2 — Version Mismatch Protection
- [ ] API response includes a `schema_version` field
- [ ] Frontend checks `schema_version` on every response
- [ ] If schema version mismatch: show "Update required — please refresh" banner
- [ ] This prevents stale frontend code from misinterpreting new API fields

### 18.3 — Missing Data Graceful Handling
- [ ] If `injury_adjustment` is null → game card shows no injury badge (not a crash)
- [ ] If `hmm_regime_state` is null → regime badge shows "—" (not undefined)
- [ ] If `sharp_action_detected` is null → sharp icon hidden (not error)
- [ ] If `factor_scores` is null → factor section hidden on game card expand
- [ ] If `perception_gap` is null → contrarian section hidden
- [ ] Run frontend with backend returning ONLY core fields (Phase 1 only) → verify no crashes
- [ ] Run frontend with backend returning ALL fields (all 28 phases) → verify all render

---

## Section 19: Security & Auth Verification

### 19.1 — Route Protection
- [ ] All `/api/engine/*` routes require admin authentication
- [ ] `POST /api/engine/config` requires admin auth (prevents unauthorized config changes)
- [ ] `POST /api/engine/control` (pause/resume/stop) requires admin auth
- [ ] Frontend settings page only accessible to admin users
- [ ] Non-admin users see prediction data but cannot modify config or trigger actions

### 19.2 — CORS & Network Security
- [ ] VPS API only accepts requests from Vercel domain + localhost (CORS)
- [ ] `ENGINE_API_SECRET` header required on all VPS → Vercel API calls
- [ ] No sensitive data (API keys, book credentials) exposed in frontend responses
- [ ] Telegram bot token not exposed in any frontend-accessible route

---

## Section 20: Hot Bets / Oracle Feed Page

> **Page:** `frontend/src/app/monolith/hot/page.tsx` (existing)

### 20.1 — Signal Display in Hot Bets
- [ ] Tonight's highest-edge signals displayed as cards
- [ ] Each card shows: teams, edge, confidence, regime states, timing recommendation
- [ ] Cards sorted by edge (highest first)
- [ ] Live signals (in-game) appear with live score + Markov probability
- [ ] Contrarian signals marked with special badge
- [ ] Clicking a card navigates to signal detail view (Section 17.2)
