# NBA Engine Upgrade — Deployment Checklist
### *Phase-by-Phase Upload to VPS (Hetzner) & Vercel*

> Every phase is listed in build order. For each phase, check off the VPS upload (Python backend) and Vercel upload (frontend/API) once deployed.

---

## Sprint 1 — Foundation

### Phase 12: Data Quality
- [ ] **VPS:** Upload `monolith/data/quality/data_validator.py`
- [ ] **VPS:** Upload `monolith/data/quality/anomaly_detector.py`
- [ ] **VPS:** Upload `monolith/data/quality/reconciliation.py`
- [ ] **VPS:** Create PostgreSQL tables for quality logs
- [ ] **VPS:** Add data validation cron job (runs before every prediction cycle)
- [ ] **VPS:** Install dependencies: `scipy`
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Run data quality check on live feeds — all pass

### Phase 1: Dynamic Elo
- [ ] **VPS:** Upload `monolith/data/results_collector.py`
- [ ] **VPS:** Modify `monolith/strategies/prediction/elo_model.py` (replace static dict)
- [ ] **VPS:** Create PostgreSQL tables: `nba_game_results`, `nba_elo_history`
- [ ] **VPS:** Add results ingestion cron (every 30 min)
- [ ] **VPS:** Seed historical Elo from current season data
- [ ] **Vercel:** Update prediction API to serve dynamic Elo ratings
- [ ] **Verify:** Elo ratings update after tonight's games resolve

### Phase 2: Live Context
- [ ] **VPS:** Upload `monolith/data/injury_tracker.py`
- [ ] **VPS:** Upload `monolith/data/fatigue_model.py`
- [ ] **VPS:** Upload `monolith/data/momentum_tracker.py`
- [ ] **VPS:** Create PostgreSQL table: `nba_injuries`
- [ ] **VPS:** Add injury feed polling (every 15 min on game days)
- [ ] **VPS:** Install dependencies: none new
- [ ] **Vercel:** Display injury impact on game cards (optional)
- [ ] **Verify:** Injury data populates correctly; fatigue model reflects B2B games

### Phase 2.5: Markov Chains (8 implementations)
- [ ] **VPS:** Upload `monolith/models/markov/hmm_regime.py` (2.5.1)
- [ ] **VPS:** Upload `monolith/models/markov/hmm_xgb_features.py` (2.5.2)
- [ ] **VPS:** Upload `monolith/models/markov/live_chain.py` (2.5.3)
- [ ] **VPS:** Upload `monolith/models/markov/bayesian_mcmc_elo.py` (2.5.4)
- [ ] **VPS:** Upload `monolith/models/markov/higher_order_chain.py` (2.5.5)
- [ ] **VPS:** Upload `monolith/models/markov/coupled_division.py` (2.5.6)
- [ ] **VPS:** Upload `monolith/models/markov/absorbing_chain.py` (2.5.7)
- [ ] **VPS:** Upload `monolith/models/markov/continuous_time.py` (2.5.8)
- [ ] **VPS:** Install dependencies: `hmmlearn`, `pymc`
- [ ] **VPS:** Train initial HMM on historical data
- [ ] **Vercel:** Add regime state indicator to game prediction cards (optional)
- [ ] **Verify:** HMM assigns regime states to all 30 teams; live chain runs on test game

---

## Sprint 2 — Prove It

### Phase 7: Backtesting (Early Run)
- [ ] **VPS:** Upload `monolith/backtest/data_loader.py`
- [ ] **VPS:** Upload `monolith/backtest/walk_forward.py`
- [ ] **VPS:** Upload `monolith/backtest/monte_carlo.py`
- [ ] **VPS:** Modify `monolith/integration/paper_runner.py`
- [ ] **VPS:** Download historical data (BigDataBall $20)
- [ ] **VPS:** Run 3-season backtest with Phases 1 + 2 + 2.5
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Backtest report generated; positive ROI on ≥2 of 3 seasons

### Phase 17: Model Decay Detection
- [ ] **VPS:** Upload `monolith/models/monitoring/drift_detector.py`
- [ ] **VPS:** Upload `monolith/models/monitoring/feature_tracker.py`
- [ ] **VPS:** Upload `monolith/models/monitoring/signal_decay.py`
- [ ] **VPS:** Upload `monolith/models/monitoring/auto_adaptation.py`
- [ ] **VPS:** Add drift check cron (after each game night resolves)
- [ ] **VPS:** Connect Telegram alerts for drift warnings
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Simulate drift scenario — alert fires correctly

### Phase 23: Operations Dashboard
- [ ] **VPS:** Upload `monolith/dashboard/model_health.py`
- [ ] **VPS:** Upload `monolith/dashboard/live_signal_feed.py`
- [ ] **VPS:** Upload `monolith/dashboard/pnl_tracker.py`
- [ ] **VPS:** Upload `monolith/dashboard/system_status.py`
- [ ] **VPS:** Upload `monolith/dashboard/telegram_commands.py`
- [ ] **VPS:** Install dependencies: `rich` (optional)
- [ ] **VPS:** Register Telegram bot commands (/status, /pnl, /signals, /pause, /resume)
- [ ] **Vercel:** Add `/dashboard` route with model health + P&L panels
- [ ] **Verify:** /status command returns system health; dashboard loads in browser

---

## Sprint 3 — Intelligence

### Phase 3: Player Stats
- [ ] **VPS:** Upload `monolith/data/player_stats.py`
- [ ] **VPS:** Upload `monolith/models/lineup_model.py`
- [ ] **VPS:** Upload `monolith/models/style_matchup.py`
- [ ] **VPS:** Create PostgreSQL table: `nba_player_stats`
- [ ] **VPS:** Seed player stats from Basketball-Reference / BallDontLie
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Lineup-based adjustment fires when star is ruled OUT

### Phase 4: H2H & Situational
- [ ] **VPS:** Upload `monolith/data/h2h_tracker.py`
- [ ] **VPS:** Upload `monolith/models/situational_model.py`
- [ ] **VPS:** Modify `monolith/strategies/prediction/elo_model.py` (division factor)
- [ ] **VPS:** Seed H2H data from last 3 seasons
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Revenge game detection works on a known recent example

### Phase 5: Market Intelligence
- [ ] **VPS:** Upload `monolith/data/line_tracker.py`
- [ ] **VPS:** Upload `monolith/analytics/clv_tracker.py`
- [ ] **VPS:** Upload `monolith/analytics/sharp_detector.py`
- [ ] **VPS:** Upload `monolith/analytics/steam_moves.py`
- [ ] **VPS:** Create PostgreSQL tables: `nba_line_history`, `nba_clv_log`
- [ ] **VPS:** Add line polling cron (every 10 min on game days)
- [ ] **Vercel:** Add CLV column to signal feed (optional)
- [ ] **Verify:** Opening lines captured; CLV calculated after game resolves

### Phase 14: Alternative Data
- [ ] **VPS:** Upload `monolith/data/referee_tracker.py`
- [ ] **VPS:** Upload `monolith/data/travel_tracker.py`
- [ ] **VPS:** Upload `monolith/data/environment_tracker.py`
- [ ] **VPS:** Upload `monolith/data/schedule_analysis.py`
- [ ] **VPS:** Seed referee historical data from pbpstats.com
- [ ] **VPS:** Seed arena coordinates + altitude data (static)
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Ref adjustment fires for tonight's assigned crew

---

## Sprint 4 — Advanced Quant

### Phase 8: Signal Processing
- [ ] **VPS:** Upload `monolith/models/signal/fourier.py`
- [ ] **VPS:** Upload `monolith/models/signal/wavelet.py`
- [ ] **VPS:** Upload `monolith/models/signal/mutual_info.py`
- [ ] **VPS:** Install dependencies: `pywt`
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** 7-day and 14-day cycles detected in test team data

### Phase 9: NLP & Sentiment
- [ ] **VPS:** Upload `monolith/data/nlp/twitter_listener.py`
- [ ] **VPS:** Upload `monolith/data/nlp/sentiment_analyzer.py`
- [ ] **VPS:** Upload `monolith/data/nlp/injury_extractor.py`
- [ ] **VPS:** Install dependencies: `transformers`
- [ ] **VPS:** Download pre-trained sentiment model (~500 MB)
- [ ] **VPS:** Set up X/Twitter API credentials ($100/mo)
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Sentiment scores generated for a test game

### Phase 10: Statistical Arbitrage
- [ ] **VPS:** Upload `monolith/analytics/stat_arb/cross_market.py`
- [ ] **VPS:** Upload `monolith/analytics/stat_arb/cointegration.py`
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Cross-market mispricing detector runs without error

### Phase 11: Bayesian Inference
- [ ] **VPS:** Upload `monolith/models/bayesian/posterior_elo.py`
- [ ] **VPS:** Upload `monolith/models/bayesian/credible_intervals.py`
- [ ] **VPS:** Upload `monolith/models/bayesian/bet_sizer.py`
- [ ] **VPS:** Install dependencies: `arviz`
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Posterior distribution generated for a test matchup

### Phase 15: Graph Analysis
- [ ] **VPS:** Upload `monolith/models/graph/nba_graph.py`
- [ ] **VPS:** Upload `monolith/models/graph/coaching_tree.py`
- [ ] **VPS:** Upload `monolith/models/graph/player_embeddings.py`
- [ ] **VPS:** Install dependencies: `networkx`, `node2vec`
- [ ] **VPS:** Build initial graph from transaction data
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Familiarity score generated for a recent trade matchup

---

## Sprint 5 — ML & Simulation

### Phase 6: Machine Learning
- [ ] **VPS:** Upload `monolith/ml/feature_pipeline.py`
- [ ] **VPS:** Upload `monolith/ml/xgb_predictor.py`
- [ ] **VPS:** Upload `monolith/ml/model_blender.py`
- [ ] **VPS:** Upload `monolith/ml/retrain_scheduler.py`
- [ ] **VPS:** Install dependencies: `xgboost`, `optuna`
- [ ] **VPS:** Create PostgreSQL table: `nba_features`
- [ ] **VPS:** Train initial XGBoost on all available features
- [ ] **VPS:** Add weekly retrain cron (Monday 4 AM ET)
- [ ] **Vercel:** Update prediction API to serve blended probability
- [ ] **Verify:** XGBoost generates predictions; Brier score ≤ 0.20

### Phase 21: Meta-Learning (Stacking)
- [ ] **VPS:** Upload `monolith/ml/stacking/base_outputs.py`
- [ ] **VPS:** Upload `monolith/ml/stacking/meta_learner.py`
- [ ] **VPS:** Upload `monolith/ml/stacking/dashboard.py`
- [ ] **VPS:** Install dependencies: `shap`
- [ ] **VPS:** Train meta-learner on out-of-fold base predictions
- [ ] **Vercel:** Add model contribution breakdown to dashboard (optional)
- [ ] **Verify:** Meta-learner Brier ≤ static blend Brier

### Phase 24: Information Theory (Ed Thorp)
- [ ] **VPS:** Upload `monolith/analytics/information_theory/entropy.py`
- [ ] **VPS:** Upload `monolith/analytics/information_theory/redundancy.py`
- [ ] **VPS:** Upload `monolith/analytics/information_theory/thorp_kelly.py`
- [ ] **VPS:** Run feature entropy ranking; remove zero-info features
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Feature ranking matches expectations (Elo, injuries near top)

### Phase 16: Simulation
- [ ] **VPS:** Upload `monolith/simulation/season_simulator.py`
- [ ] **VPS:** Upload `monolith/simulation/synthetic_data.py`
- [ ] **VPS:** Upload `monolith/simulation/market_sim.py`
- [ ] **VPS:** Upload `monolith/simulation/stress_tester.py`
- [ ] **VPS:** Install dependencies: `sdv`
- [ ] **VPS:** Run 10,000-sim Monte Carlo; store results
- [ ] **Vercel:** Add championship probability page (optional)
- [ ] **Verify:** Season sim produces 30-team probability distributions

### Phase 7: Backtesting (Final Validation)
- [ ] **VPS:** Re-run walk-forward backtest with ALL features (Phases 1-24)
- [ ] **VPS:** Run Monte Carlo with full model
- [ ] **VPS:** Start paper trading mode (2+ weeks minimum)
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Positive ROI on ≥2/3 seasons; probability of ruin < 5%

---

## Sprint 6 — Mastery

### Phase 22: Causal Inference
- [ ] **VPS:** Upload `monolith/analytics/causal/natural_experiments.py`
- [ ] **VPS:** Upload `monolith/analytics/causal/instrumental_variables.py`
- [ ] **VPS:** Upload `monolith/analytics/causal/granger.py`
- [ ] **VPS:** Upload `monolith/analytics/causal/feature_audit.py`
- [ ] **VPS:** Install dependencies: `statsmodels`, `linearmodels`
- [ ] **VPS:** Run full feature causality audit
- [ ] **VPS:** Remove/flag all CORRELATED features
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Audit classifies every feature; HMM Granger-causes line movement

### Phase 13: Reinforcement Learning
- [ ] **VPS:** Upload `monolith/models/rl/bet_timer.py`
- [ ] **VPS:** Upload `monolith/models/rl/signal_selector.py`
- [ ] **VPS:** Upload `monolith/models/rl/bankroll_ppo.py`
- [ ] **VPS:** Install dependencies: `torch`
- [ ] **VPS:** Train DQN on historical line movement data
- [ ] **VPS:** Train PPO on historical bankroll simulation
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** DQN recommends bet timing; PPO adjusts sizing during simulated drawdown

### Phase 18: Execution Infrastructure
- [ ] **VPS:** Upload `monolith/execution/line_shopper.py`
- [ ] **VPS:** Upload `monolith/execution/account_manager.py`
- [ ] **VPS:** Upload `monolith/execution/order_fragmenter.py`
- [ ] **VPS:** Configure multi-book API credentials
- [ ] **VPS:** Set up account health monitoring per book
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Line shopper returns best available line across books

### Phase 19: Portfolio Theory
- [ ] **VPS:** Upload `monolith/models/portfolio/correlation.py`
- [ ] **VPS:** Upload `monolith/models/portfolio/optimizer.py`
- [ ] **VPS:** Upload `monolith/models/portfolio/hedging.py`
- [ ] **Vercel:** Add portfolio risk display to dashboard (optional)
- [ ] **Verify:** Optimizer produces allocation for a 4-game slate

### Phase 20: Adversarial Robustness
- [ ] **VPS:** Upload `monolith/analytics/trap_detector.py`
- [ ] **VPS:** Upload `monolith/analytics/adversarial_testing.py`
- [ ] **VPS:** Upload `monolith/analytics/overfit_immunizer.py`
- [ ] **VPS:** Upload `monolith/analytics/self_bias_detector.py`
- [ ] **VPS:** Run adversarial test suite on current model
- [ ] **VPS:** Run 5-point overfit immunization check
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** All 5 overfit checks pass; blind spots report generated

---

## Sprint 7 — Legendary

### Phase 25: Transfer Learning (D.E. Shaw)
- [ ] **VPS:** Upload `monolith/analytics/transfer/cross_sport.py`
- [ ] **VPS:** Upload `monolith/analytics/transfer/financial_transfer.py`
- [ ] **VPS:** Upload `monolith/analytics/transfer/domain_adaptation.py`
- [ ] **VPS:** Install dependencies: `arch`
- [ ] **VPS:** Download NFL/MLB historical data for cross-sport testing
- [ ] **VPS:** Run GARCH volatility model on all 30 teams
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** GARCH vol regime assigned to each team; at least 1 cross-sport pattern confirmed

### Phase 26: Decision Journal (Ray Dalio)
- [ ] **VPS:** Upload `monolith/journal/pre_mortem.py`
- [ ] **VPS:** Upload `monolith/journal/post_mortem.py`
- [ ] **VPS:** Upload `monolith/journal/believability.py`
- [ ] **VPS:** Create PostgreSQL table: `decision_journal`
- [ ] **VPS:** Wire pre-mortem into signal generation pipeline
- [ ] **VPS:** Wire post-mortem into game resolution pipeline
- [ ] **VPS:** Add weekly review Telegram report (Monday mornings)
- [ ] **Vercel:** Add decision journal viewer to dashboard (optional)
- [ ] **Verify:** Pre-mortem logs for tonight's signals; post-mortem generated after resolution

### Phase 27: Factor Investing (Cliff Asness)
- [ ] **VPS:** Upload `monolith/models/factors/nba_factors.py`
- [ ] **VPS:** Upload `monolith/models/factors/crowding_detector.py`
- [ ] **VPS:** Upload `monolith/models/factors/factor_timer.py`
- [ ] **VPS:** Calculate all 6 factor scores for all 30 teams
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Factor scores generated; crowding detector flags momentum when public bet % > 70%

### Phase 28: Reflexivity (George Soros)
- [ ] **VPS:** Upload `monolith/analytics/reflexivity/perception_tracker.py`
- [ ] **VPS:** Upload `monolith/analytics/reflexivity/narrative_detector.py`
- [ ] **VPS:** Upload `monolith/analytics/reflexivity/contrarian_signal.py`
- [ ] **VPS:** Upload `monolith/analytics/reflexivity/decay_timer.py`
- [ ] **VPS:** Seed ESPN power rankings + national TV schedule
- [ ] **Vercel:** No frontend changes needed
- [ ] **Verify:** Perception gap calculated for all 30 teams; contrarian signal fires on known overhyped team

---

## Signal Pipeline Orchestrator (CRITICAL — The Glue)

> This is what actually *runs* when you call for new bets. Without this, all 28 phases are just isolated modules that never talk to each other.

### Pipeline Orchestrator
- [ ] **VPS:** Upload `monolith/pipeline/signal_orchestrator.py` — master pipeline that:
  1. Fetches tonight's NBA schedule
  2. Runs data quality checks (Phase 12)
  3. Computes dynamic Elo for both teams (Phase 1)
  4. Pulls injury data + calculates impact (Phase 2)
  5. Computes fatigue + momentum (Phase 2)
  6. Gets current HMM regime state (Phase 2.5)
  7. Pulls player stats + lineup adjustments (Phase 3)
  8. Evaluates H2H + situational spots (Phase 4)
  9. Fetches current odds + detects line movement (Phase 5)
  10. Runs Fourier + wavelet cycle check (Phase 8)
  11. Runs NLP sentiment check (Phase 9)
  12. Evaluates stat arb opportunities (Phase 10)
  13. Generates Bayesian posterior (Phase 11)
  14. Checks alternative data (refs, travel, altitude) (Phase 14)
  15. Runs graph/network features (Phase 15)
  16. Assembles full feature vector (Phase 6)
  17. Runs XGBoost prediction (Phase 6)
  18. Runs meta-learner stacking (Phase 21)
  19. Runs information gain check (Phase 24)
  20. Computes factor scores (Phase 27)
  21. Checks perception/reflexivity gap (Phase 28)
  22. Runs causal feature audit on active features (Phase 22)
  23. Runs trap line detector (Phase 20)
  24. Generates final blended probability + confidence
  25. Computes edge vs market
  26. Runs DQN bet timer (Phase 13) — when to place
  27. Runs PPO bankroll sizer (Phase 13) — how much
  28. Runs multivariate Kelly (Phase 24) — correlated sizing
  29. Runs portfolio optimizer (Phase 19) — tonight's allocation
  30. Generates contrarian signal if applicable (Phase 28)
  31. Creates pre-mortem decision record (Phase 26)
  32. Sends signal via Telegram + stores in DB
- [ ] **VPS:** Upload `monolith/pipeline/phase_registry.py` — registry of all phase modules with:
  - Enable/disable toggle per phase (for gradual rollout)
  - Timeout per phase (if one phase hangs, skip it gracefully)
  - Fallback values when a phase fails (e.g., default to 0 adjustment)
  - Phase execution order and dependency graph
- [ ] **VPS:** Upload `monolith/pipeline/config.yaml` — global configuration:
  - `min_edge_threshold: 0.03` (minimum edge to generate a signal)
  - `max_kelly_fraction: 0.05` (never risk > 5% on one bet)
  - `kelly_multiplier: 0.35` (fractional Kelly)
  - `confidence_thresholds: {LOW: 0.03, MEDIUM: 0.05, HIGH: 0.08, EXTREME: 0.12}`
  - `active_phases: [1, 2, 2.5, 3, 4, 5, 6, ...]` (which phases are turned on)
  - `max_signals_per_night: 5` (cap to avoid over-betting)
  - `max_exposure_pct: 0.15` (never risk > 15% bankroll in one night)
  - `paper_trading_mode: true` (safety switch)
- [ ] **VPS:** Upload `monolith/pipeline/error_handler.py` — graceful degradation:
  - If ESPN API is down → use cached data (< 1 hour old) or skip
  - If XGBoost crashes → fall back to Elo-only prediction
  - If one phase throws an exception → log it, skip it, continue pipeline
  - If >3 phases fail → abort signal generation entirely, alert via Telegram
  - All errors logged to `pipeline_errors` PostgreSQL table
- [ ] **Verify:** Run full pipeline on a test game — signal generated end-to-end

### Game Resolution Pipeline
- [ ] **VPS:** Upload `monolith/pipeline/resolution_orchestrator.py` — runs after games finish:
  1. Ingests final scores (Phase 1)
  2. Updates Elo ratings (Phase 1)
  3. Calculates CLV for tonight's signals (Phase 5)
  4. Runs post-mortem on each decision (Phase 26)
  5. Updates model health metrics (Phase 23)
  6. Checks for drift (Phase 17)
  7. Updates believability scores (Phase 26)
  8. Updates P&L tracker (Phase 23)
  9. Updates factor performance tracking (Phase 27)
  10. Updates HMM states with tonight's results (Phase 2.5)
  11. Logs all updates to decision journal
- [ ] **VPS:** Add resolution cron (runs 1 AM ET — after all West Coast games finish)
- [ ] **Verify:** After a game night, all post-game updates complete within 15 minutes

---

## Environment & Secrets Management

- [ ] **VPS:** Create `.env.production` with all required keys:
  - `DATABASE_URL` (PostgreSQL connection string)
  - `ESPN_API_KEY` (if applicable)
  - `ODDS_API_KEY` (The Odds API)
  - `SPORTSDATA_API_KEY` (SportsData.io — $50/mo)
  - `TWITTER_BEARER_TOKEN` (X API — $100/mo)
  - `TELEGRAM_BOT_TOKEN` (already exists)
  - `TELEGRAM_CHAT_ID` (already exists)
  - Multi-book credentials (DraftKings, FanDuel, BetMGM, etc.)
  - `KELLY_MULTIPLIER=0.35`
  - `PAPER_TRADING_MODE=true`
  - `MIN_EDGE_THRESHOLD=0.03`
- [ ] **VPS:** Ensure `.env.production` is NOT in git (check `.gitignore`)
- [ ] **Vercel:** Add environment variables for frontend API auth:
  - `NEXT_PUBLIC_API_BASE_URL` (VPS API endpoint)
  - `ENGINE_API_SECRET` (shared secret for VPS ↔ Vercel auth)
- [ ] **Verify:** `python -c "from dotenv import load_dotenv; load_dotenv(); print('OK')"` succeeds

---

## Database Migration Script

- [ ] **VPS:** Upload `monolith/db/migrations/001_engine_upgrade.sql`:
  ```
  Tables to create:
  - nba_game_results        (Phase 1)
  - nba_elo_history          (Phase 1)
  - nba_injuries             (Phase 2)
  - nba_player_stats         (Phase 3)
  - nba_line_history         (Phase 5)
  - nba_clv_log              (Phase 5)
  - nba_features             (Phase 6)
  - pipeline_errors          (Orchestrator)
  - signal_history           (Orchestrator)
  - decision_journal         (Phase 26)
  - model_health_snapshots   (Phase 23)
  - data_quality_logs        (Phase 12)
  ```
- [ ] **VPS:** Run migration script: `psql $DATABASE_URL < 001_engine_upgrade.sql`
- [ ] **VPS:** Verify all tables exist: `\dt` shows all 12 new tables
- [ ] **VPS:** Create DB indexes on frequently queried columns:
  - `nba_game_results(date)`, `nba_elo_history(team, date)`
  - `signal_history(date, game_id)`, `decision_journal(date)`
- [ ] **VPS:** Set up automated daily DB backup (pg_dump to S3 or local)

---

## Complete Cron Schedule

> All times Eastern. Verify each cron entry is in the VPS crontab.

| Time | Frequency | Job | Phase |
|------|-----------|-----|-------|
| Every 30 min | All day | Results ingestion | Phase 1 |
| Every 15 min | Game days (3-11 PM) | Injury polling | Phase 2 |
| Every 10 min | Game days (12-7 PM) | Line/odds polling | Phase 5 |
| 9:00 AM | Daily | Data quality check | Phase 12 |
| 10:00 AM | Game days | Run signal pipeline (early scan) | Orchestrator |
| 2:00 PM | Game days | Run signal pipeline (main run) | Orchestrator |
| 5:30 PM | Game days | Run signal pipeline (post-injury-report) | Orchestrator |
| 6:30 PM | Game days | Final signal pipeline (lineup-adjusted) | Orchestrator |
| 1:00 AM | Daily | Game resolution pipeline | Orchestrator |
| 4:00 AM | Monday | XGBoost retrain | Phase 6 |
| 4:00 AM | Monday | HMM retrain | Phase 2.5 |
| 5:00 AM | Monday | Weekly decision journal review → Telegram | Phase 26 |
| 6:00 AM | Monday | Model health + drift report → Telegram | Phase 17/23 |
| 3:00 AM | Daily | PostgreSQL backup | Ops |

- [ ] **VPS:** All 14 cron entries added to crontab
- [ ] **VPS:** Each cron job logs to `/var/log/monolith/<job_name>.log`
- [ ] **VPS:** Cron failure sends Telegram alert (wrap each job in error handler)
- [ ] **Verify:** Run `crontab -l` and confirm all entries present

---

## Rollback & Recovery Procedures

- [ ] **VPS:** Document rollback procedure per phase:
  - Each phase has a feature flag in `config.yaml` → can be disabled without code change
  - Revert to previous `elo_model.py` if Phase 1 breaks (keep backup)
  - XGBoost model versioning: `models/xgb_v{N}.pkl` — can revert to v(N-1)
  - HMM model versioning: `models/hmm_v{N}.pkl` — can revert to v(N-1)
- [ ] **VPS:** Create `monolith/pipeline/emergency_stop.py`:
  - `/stop` Telegram command immediately halts all signal generation
  - Sets `PAPER_TRADING_MODE=true` in config
  - Sends confirmation: "🛑 All signal generation halted. Paper trading mode ON."
- [ ] **VPS:** DB rollback: if migrations break, restore from latest backup
- [ ] **VPS:** Docker: store previous container image tag for instant rollback
  - `docker-compose down && docker-compose -f docker-compose.rollback.yml up`
- [ ] **Verify:** Simulate emergency stop → confirm all signals halt within 60 seconds

---

## Integration Test Suite

> Run these BEFORE going live. Each test verifies the full pipeline, not just individual phases.

- [ ] **Test 1: Full Pipeline Dry Run**
  - Feed in a known historical game (e.g., BOS vs NYK, March 5, 2025)
  - Verify: signal generated with probability, edge, confidence, sizing
  - Verify: pre-mortem decision log created
  - Verify: no errors in pipeline log
- [ ] **Test 2: Injury Injection Test**
  - Simulate: Jayson Tatum ruled OUT before BOS game
  - Verify: Elo adjustment fires (~-150)
  - Verify: Lineup model adjusts BPM sum
  - Verify: Signal probability shifts by ≥5%
- [ ] **Test 3: Line Movement Test**
  - Simulate: line moves 2 points in 30 minutes
  - Verify: steam move detector fires
  - Verify: sharp action flag set
  - Verify: signal confidence adjusts
- [ ] **Test 4: Phase Failure Graceful Degradation**
  - Disable Phase 9 (NLP) and Phase 15 (Graph) in config
  - Run pipeline → verify it still generates a valid signal
  - Verify: fallback values used, no crash
- [ ] **Test 5: Multi-Game Portfolio Test**
  - Feed in a 6-game slate
  - Verify: portfolio optimizer runs
  - Verify: correlation matrix generated
  - Verify: no single bet exceeds max_kelly_fraction
  - Verify: total exposure doesn't exceed max_exposure_pct
- [ ] **Test 6: Resolution Pipeline Test**
  - Feed in final scores for a completed game
  - Verify: Elo updates, CLV calculated, post-mortem generated
  - Verify: P&L tracker updated, model health recalculated
- [ ] **Test 7: Edge Case — No Games Today**
  - Run pipeline on an off-day
  - Verify: pipeline exits cleanly with "no games today" log
  - Verify: no signals generated, no errors thrown
- [ ] **Test 8: Edge Case — All-Star Break**
  - Simulate running during All-Star break
  - Verify: schedule analysis correctly identifies break
  - Verify: momentum windows don't cross the break gap

---

## Final Go-Live Checklist

- [ ] **Paper trading:** 2 consecutive winning weeks with positive CLV
- [ ] **All Phase 7 backtests pass:** ROI ≥ 3%, ruin probability < 5%
- [ ] **All Phase 20 overfit tests pass:** 5/5 checks green
- [ ] **Phase 23 dashboard operational:** /status, /pnl, /signals all working
- [ ] **Phase 17 drift detection live:** Telegram alerts configured
- [ ] **Phase 18 accounts active:** ≥ 3 sportsbooks with funded accounts
- [ ] **Phase 26 journal wired:** Pre/post-mortem logging on every signal
- [ ] **All 8 integration tests pass**
- [ ] **Emergency stop tested:** /stop Telegram command halts everything
- [ ] **Rollback tested:** Can revert to previous model version in < 5 min
- [ ] **Cron schedule verified:** All 14 jobs running, logs rotating
- [ ] **DB backup verified:** Latest backup restorable
- [ ] **VPS health check:** All cron jobs running, DB connections stable
- [ ] **Vercel health check:** Frontend loads, prediction API responds < 500ms
- [ ] **Config set:** `PAPER_TRADING_MODE=false`, `KELLY_MULTIPLIER=0.35`
- [ ] **🚀 GO LIVE** — Switch from paper trading to real capital
