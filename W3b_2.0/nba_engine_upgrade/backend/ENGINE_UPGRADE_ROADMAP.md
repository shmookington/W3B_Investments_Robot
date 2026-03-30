# M.O.N.O.L.I.T.H. — Prediction Engine Upgrade 

---

## Current State (What We're Replacing)

The entire prediction engine is currently a single file: `strategies/prediction/elo_model.py` — a **hardcoded Python dictionary** of 30 team ratings that never updates. It knows nothing about injuries, momentum, fatigue, matchup history, or market movement. It applies a flat +50 Elo "home court" bonus and outputs a probability.

**Goal:** Replace this with a multi-layer quantitative ensemble that ingests live data from 5+ sources, adjusts for 15+ contextual factors, and produces calibrated probabilities that consistently beat closing lines (positive CLV).

---

## Phase 1: Dynamic Elo System *(Replace the Static Dictionary)*

> **Objective:** Make the Elo ratings update automatically after every game result, so the model learns from the season in real-time instead of using frozen preseason ratings.

- [x] **1.1 — Automated Game Result Ingestion**
  - [x] Build `ResultsCollector` class that polls ESPN Scoreboard API every 30 minutes for final scores
  - [x] Parse final scores and map to existing team names in the Elo dictionary
  - [x] Store results in PostgreSQL table: `nba_game_results(date, home_team, away_team, home_score, away_score, margin)`
  - **Data Source:** ESPN Scoreboard API (free, already integrated)
  - **File:** `NEW → monolith/data/results_collector.py`

- [x] **1.2 — Elo Rating Auto-Updater**
  - [x] After each game result, apply standard Elo update formula: `new_rating = old_rating + K * (actual - expected)`
  - [x] Use adaptive K-factor: K=20 for regular season, K=30 for playoffs, K=10 for preseason
  - [x] Store rating history in PostgreSQL: `nba_elo_history(date, team, rating, games_played)`
  - [x] Add season-start regression (pull all teams 33% toward 1500 at season start)
  - **File:** `MODIFY → monolith/strategies/prediction/elo_model.py`

- [x] **1.3 — Margin-of-Victory Adjustment**
  - [x] Upgrade from binary win/loss Elo to MOV-adjusted Elo (FiveThirtyEight-style)
  - [x] Formula: `MOV_multiplier = log(abs(margin) + 1) * (2.2 / (winner_elo_diff * 0.001 + 2.2))`
  - [x] This prevents blowout wins against tanking teams from over-inflating ratings
  - **File:** `MODIFY → monolith/strategies/prediction/elo_model.py`

- [x] **1.4 — Home Court Advantage Calibration**
  - [x] Replace flat +50 HCA with team-specific home court values
  - [x] Calculate from actual home/away splits: `team_hca = (home_win% - away_win%) * K`
  - [x] Some teams (e.g., Denver at altitude) have +80 HCA, others (e.g., rebuilding teams) have +20
  - **File:** `MODIFY → monolith/strategies/prediction/elo_model.py`

### ✅ Phase 1 Verification
- [x] After 1 week of live data, compare dynamic Elo predictions to the old static predictions
- [x] Measure: log-loss and Brier score against actual game outcomes
- [x] Target: Dynamic Elo should have ≥5% lower Brier score than static

---

## Phase 2: Live Context Feeds *(Injuries, Rest, Travel)*

> **Objective:** Give the model awareness of the single biggest factor Vegas prices in: **who is actually playing tonight.**

- [x] **2.1 — Injury Report Integration**
  - [x] Subscribe to injury feed API (options: SportsData.io $50/mo, ESPN injury endpoint, or BallDontLie free tier)
  - [x] Build `InjuryTracker` class that maintains current injury status for all NBA players
  - [x] Categorize impact: `OUT` (star = -150 Elo, rotation = -30 Elo), `DOUBTFUL` (-80 Elo), `QUESTIONABLE` (-40 Elo), `PROBABLE` (-10 Elo)
  - [x] Map player impact to team-level Elo adjustment using VORP/BPM data
  - [x] Store in PostgreSQL: `nba_injuries(date, player, team, status, estimated_impact_elo)`
  - **Data Sources:** ESPN Injuries API, SportsData.io, official NBA injury reports (published 5:00 PM ET)  
  - **File:** `NEW → monolith/data/injury_tracker.py`

- [x] **2.2 — Rest & Fatigue Model**
  - [x] Track days since last game for each team (0 = back-to-back, 1 = normal, 2+ = well-rested)
  - [x] Apply rest advantage adjustment: B2B team gets -30 Elo, 2+ rest days gets +15 Elo
  - [x] Track 3-in-4-nights and 4-in-5-nights scenarios for compounding fatigue (-50 Elo)
  - [x] Factor in travel distance between consecutive game cities (>1500 miles = additional -10 Elo)
  - **Data Source:** ESPN Schedule API (already integrated)
  - **File:** `NEW → monolith/data/fatigue_model.py`

- [x] **2.3 — Recent Form / Momentum**
  - [x] Calculate rolling 10-game win% and point differential
  - [x] Weight recent games higher: exponential decay with half-life of 15 games
  - [x] A team on a 8-2 hot streak gets +20 Elo; a team on a 2-8 skid gets -20 Elo
  - [x] Detect regime changes (coaching fires, major trades) and reset momentum window
  - **File:** `NEW → monolith/data/momentum_tracker.py`

### ✅ Phase 2 Verification
- [x] Backtest against 2024-25 season: predictions with injury data vs without
- [x] Target: Injury-aware model should have ≥8% lower Brier score on games with significant absences
- [x] Verify: When a top-10 player is OUT, does our model shift probability by ≥5%?

---

## Phase 3: Advanced Player-Level Statistics

> **Objective:** Move beyond team-level ratings to understand *which specific players* drive wins, enabling precise injury impact and lineup-based predictions.

- [x] **3.1 — Player Impact Database**
  - [x] Ingest per-player advanced stats: BPM (Box Plus/Minus), VORP, PER, Win Shares, Net Rating
  - [x] Build player impact model: `player_elo_contribution = BPM * minutes_share * team_pace_factor`
  - [x] Store: `nba_player_stats(player, team, season, bpm, vorp, per, ws, minutes_pct)`
  - **Data Sources:** Basketball-Reference (scrape), NBA Stats API (free), BallDontLie API (free)
  - **File:** `NEW → monolith/data/player_stats.py`

- [x] **3.2 — Lineup-Based Adjustments**
  - [x] When the starting lineup is announced (typically 30 min before tip), calculate the net BPM of the actual starting 5 vs the full-strength starting 5
  - [x] Adjust team Elo proportionally: `lineup_adjustment = sum(missing_player_bpm * minutes_share) * -10`
  - [x] This makes injury adjustments precise rather than generic
  - **File:** `NEW → monolith/models/lineup_model.py`

- [x] **3.3 — Pace & Style Matchup Factor**
  - [x] Track offensive/defensive ratings and pace for each team
  - [x] Certain styles exploit each other: fast-pace teams struggle vs elite half-court defenses
  - [x] Build a 30×30 "style clash" matrix using historical data
  - **File:** `NEW → monolith/models/style_matchup.py`

### ✅ Phase 3 Verification
- [x] Compare: team-only Elo predictions vs player-aware predictions on nights with 2+ star absences
- [x] Target: Player-aware model should correctly flip the predicted winner in ≥60% of "upset" games where a star was ruled out last-minute

---

## Phase 4: Head-to-Head & Situational Analysis

> **Objective:** Some teams consistently beat certain opponents regardless of overall record. Capture these matchup dynamics.

- [x] **4.1 — Head-to-Head Record Tracker**
  - [x] Store all matchups for current + previous 3 seasons
  - [x] Calculate H2H-specific win probability using recent meetings (weighted by recency)
  - [x] Apply small adjustment: if Team A is 5-1 against Team B in last 3 years, apply +15 Elo for Team A in this specific matchup
  - **File:** `NEW → monolith/data/h2h_tracker.py`

- [x] **4.2 — Division / Conference Familiarity**
  - [x] Teams in the same division play 4x/year — more data = better predictions
  - [x] Apply division rivalry factor and familiarity bonus
  - **File:** `MODIFY → monolith/strategies/prediction/elo_model.py`

- [x] **4.3 — Situational Spotting**
  - [x] Detect "look-ahead" spots (team plays a weak opponent before a marquee matchup)
  - [x] Detect "letdown" spots (team coming off a big emotional win)
  - [x] Detect "revenge" spots (team lost to this opponent recently by 15+)
  - [x] Each situation applies a ±10-20 Elo adjustment
  - **File:** `NEW → monolith/models/situational_model.py`

### ✅ Phase 4 Verification
- [x] Backtest situational spots against 3 seasons of data
- [x] Target: "Revenge game" and "letdown" adjustments should improve ATS prediction accuracy by ≥2%

---

## Phase 5: Market Intelligence *(Line Movement & Sharp Money)*

> **Objective:** Instead of just comparing our price to the opening line, track *how* the line moves and detect when sharp bettors are hammering a side. If the sharps agree with our model, confidence should spike.

- [ ] **5.1 — Opening & Closing Line Tracker**
  - [ ] Record the opening spread + moneyline when first posted (typically 24 hours before tip)
  - [ ] Record the closing line at tip-off
  - [ ] Store: `nba_line_history(game_id, timestamp, spread, home_ml, away_ml, total, source)`
  - **Data Sources:** The Odds API (free tier: 500 req/month), ESPN odds (already integrated)
  - **File:** `NEW → monolith/data/line_tracker.py`

- [ ] **5.2 — Closing Line Value (CLV) Analysis**
  - [ ] After each game, compare our predicted probability at signal time vs the closing line probability
  - [ ] If we consistently beat the closing line (our price was better than where the market settled), we have genuine edge
  - [ ] This is the **#1 metric** professional sports bettors use to validate their models
  - [ ] Store: `nba_clv_log(game_id, our_prob, closing_prob, clv_cents, result)`
  - **File:** `NEW → monolith/analytics/clv_tracker.py`

- [ ] **5.3 — Sharp vs Public Money Detection**
  - [ ] Track line movement direction vs bet% direction
  - [ ] "Reverse line movement" = public betting one side but the line moves the OTHER way → sharps are on the opposite side
  - [ ] If sharps align with our model → boost confidence to EXTREME
  - [ ] If sharps disagree with our model → downgrade confidence, flag for review
  - **File:** `NEW → monolith/analytics/sharp_detector.py`

- [ ] **5.4 — Steam Move Detection**
  - [ ] Detect sudden, coordinated line movements across 3+ sportsbooks within 5 minutes
  - [ ] Steam moves indicate large syndicate action — very high signal value
  - [ ] Alert via Telegram when a steam move aligns with our model prediction
  - **File:** `NEW → monolith/analytics/steam_moves.py`

### ✅ Phase 5 Verification
- [ ] After 30 days of CLV tracking, calculate our average CLV per signal
- [ ] Target: Positive CLV of ≥1.5 cents average across all signals = we have real edge
- [ ] If CLV is negative, the model needs more work before risking real capital

---

## Phase 6: Machine Learning Layer

> **Objective:** Use all the features from Phases 1-5 as inputs to a gradient-boosted ensemble that learns non-linear relationships humans can't spot.

- [ ] **6.1 — Feature Engineering Pipeline**
  - [ ] Build automated feature matrix from all data sources:
    - Dynamic Elo ratings + Elo delta (how much team improved in last 30 days)
    - Injury-adjusted team strength
    - Rest days differential
    - H2H record
    - Home/away splits
    - Recent form (10-game rolling)
    - Opening line + current line + line movement magnitude
    - Pace differential
    - Player BPM sum for expected starters
  - [ ] Normalize all features to z-scores
  - [ ] Store feature snapshots for backtesting: `nba_features(game_id, feature_vector, label)`
  - **File:** `NEW → monolith/ml/feature_pipeline.py`

- [ ] **6.2 — XGBoost / LightGBM Model**
  - [ ] Train gradient-boosted model on 3+ seasons of historical feature data
  - [ ] Target variable: binary win/loss (moneyline) and margin of victory (spread)
  - [ ] Use time-series cross-validation (train on months 1-6, validate on month 7, etc.)
  - [ ] Hyperparameter tuning via Optuna
  - [ ] Output: calibrated probability (use Platt scaling or isotonic regression)
  - **File:** `NEW → monolith/ml/xgb_predictor.py`

- [ ] **6.3 — Model Calibration & Blending**
  - [ ] Blend Elo probability (40% weight) + XGBoost probability (40%) + Market consensus (20%)
  - [ ] Use isotonic regression to ensure calibrated outputs (when model says 70%, it should win 70% of the time)
  - [ ] Monitor calibration drift weekly and retrain monthly
  - **File:** `NEW → monolith/ml/model_blender.py`

- [ ] **6.4 — Automated Retraining Loop**
  - [ ] Every Monday at 4 AM ET, retrain XGBoost on all data from current season
  - [ ] Compare new model's validation Brier score vs production model
  - [ ] Auto-promote if new model is ≥1% better; alert via Telegram if worse
  - **File:** `NEW → monolith/ml/retrain_scheduler.py`

### ✅ Phase 6 Verification
- [ ] Walk-forward backtest across 3 NBA seasons
- [ ] Target metrics:
  - Brier score ≤ 0.20 (better than market average of ~0.22)
  - ROI ≥ 3% on flat-bet simulation at -110 odds
  - Positive CLV on ≥55% of flagged signals
- [ ] If targets not met, iterate on features before deploying live

---

## Phase 7: Historical Backtesting & Validation Framework

> **Objective:** Before risking any real money, prove the upgraded engine would have been profitable across multiple historical seasons.

- [ ] **7.1 — Historical Data Collection**
  - [ ] Download 5+ seasons of NBA game results with box scores
  - [ ] Download historical odds/closing lines from covers.com or BigDataBall ($20 one-time)
  - [ ] Download historical injury reports from Basketball-Reference transaction logs
  - **File:** `NEW → monolith/backtest/data_loader.py`

- [ ] **7.2 — Walk-Forward Backtester**
  - [ ] Simulate the engine as if it were running live each day of each season
  - [ ] Use only data available *before* each game (no lookahead bias)
  - [ ] Apply Kelly criterion position sizing with the user's configured bankroll
  - [ ] Track: ROI, max drawdown, win rate, avg edge, CLV, Sharpe ratio
  - **File:** `NEW → monolith/backtest/walk_forward.py`

- [ ] **7.3 — Monte Carlo Simulation**
  - [ ] Run 10,000 simulations of each season using the model's probability outputs
  - [ ] Calculate: probability of ruin, expected annual return, 95% confidence interval for PnL
  - [ ] This answers: "If I bet $1,000/month using this model, what's the realistic range of outcomes?"
  - **File:** `NEW → monolith/backtest/monte_carlo.py`

- [ ] **7.4 — Paper Trading Mode**
  - [ ] Before going live with real money, run the full upgraded engine in paper trading mode for 2+ weeks
  - [ ] Track every signal it would have generated and compare to actual outcomes
  - [ ] Only go live when paper trading shows positive CLV over 50+ bets
  - **File:** `MODIFY → monolith/integration/paper_runner.py`

### ✅ Phase 7 Verification
- [ ] 3-season backtest shows positive ROI on ≥2 out of 3 seasons
- [ ] Monte Carlo: probability of ruin < 5% with recommended bankroll
- [ ] Paper trading: 2 consecutive winning weeks with positive CLV before going live

---
## Priority Order & Estimated Timeline

### Tier 1 — Foundation (Must Complete First)
| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 1: Data Quality | 🔴 Critical | 2-3 days | Prevents catastrophic data failures |
| Phase 2: Dynamic Elo | 🔴 Critical | 2-3 days | +15% better predictions |
| Phase 3: Live Context | 🔴 Critical | 3-5 days | +25% on injury-affected games |
| Phase 4: Markov Chains (8 implementations) | 🔴 Critical | 8-10 days | Regime detection + live betting + uncertainty |

### Tier 1.5 — Prove It
| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 5: Backtesting | 🔴 Critical | 3-4 days | Walk-forward validation + go-live decision |
| Phase 6: Model Decay Detection | 🔴 Critical | 3-4 days | Auto-detects dying signals |
| Phase 7: Operations Dashboard | 🔴 Critical | 4-5 days | War room monitoring + Telegram control |

### Tier 2 — Intelligence Layer
| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 8: Player Stats | 🟡 High | 3-4 days | +10% on star-absence games |
| Phase 9: H2H & Situational | 🟡 High | 2-3 days | +5% on rivalry/situational games |
| Phase 10: Market Intelligence | 🟡 High | 3-4 days | CLV validation + confidence calibration |
| Phase 11: Alternative Data | 🟡 High | 4-5 days | Referees, travel, altitude, schedule patterns |

### Tier 3 — Advanced Quant Layer
| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 12: Signal Processing | 🟡 High | 4-5 days | Fourier/wavelet cyclic pattern detection |
| Phase 13: NLP & Sentiment | 🟡 High | 4-6 days | Early injury detection + coach signals |
| Phase 14: Statistical Arbitrage | 🟢 Medium | 3-4 days | Cross-market mispricings |
| Phase 15: Bayesian Inference | 🟡 High | 4-5 days | Full posterior distributions |
| Phase 16: Graph Analysis | 🟢 Medium | 3-4 days | NBA connectivity + coaching trees |

### Tier 4 — Machine Learning & Validation
| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 17: Machine Learning | 🟢 Medium | 5-7 days | XGBoost ensemble (compounds everything) |
| Phase 18: Meta-Learning (Stacking) | 🟡 High | 4-5 days | Context-dependent model weighting |
| Phase 19: Information Theory | 🟡 High | 3-4 days | Eliminates low-info bets + optimal growth (Ed Thorp) |
| Phase 20: Simulation | 🟡 High | 4-5 days | Monte Carlo seasons + synthetic data |

### Tier 5 — Mastery (Full Renaissance Level)
| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 21: Causal Inference | 🟡 High | 3-4 days | Separates real signals from spurious correlations |
| Phase 22: Reinforcement Learning | 🟡 High | 5-7 days | Optimal bet timing + adaptive sizing |
| Phase 23: Execution Infrastructure | 🟡 High | 4-5 days | Multi-book line shopping + stealth |
| Phase 24: Portfolio Theory | 🟡 High | 3-4 days | Correlated bet optimization |
| Phase 25: Adversarial Robustness | 🟢 Medium | 3-4 days | Trap detection + overfit immunization |

### Tier 6 — Legendary Trader Insights
| Phase | Priority | Effort | Impact | Inspired By |
|-------|----------|--------|--------|-------------|
| Phase 26: Transfer Learning | 🟢 Medium | 4-5 days | Cross-sport + financial pattern transfer | D.E. Shaw |
| Phase 27: Decision Journal | 🟡 High | 3-4 days | Systematic learning from every bet | Ray Dalio |
| Phase 28: Factor Investing | 🟡 High | 3-4 days | Persistent factors + crowding detection | Cliff Asness |
| Phase 29: Reflexivity | 🟢 Medium | 3-4 days | Narrative mispricing + contrarian signals | George Soros |

### Total: ~115-150 days of dedicated work (29 phases)

> **Build Order (Phase 1 → Phase 29, sequential):**
>
> **Sprint 1 (Foundation):** Phase 1 → Phase 2 → Phase 3 → Phase 4
> **Sprint 2 (Prove It):** Phase 5 → Phase 6 → Phase 7
> **Sprint 3 (Intelligence):** Phase 8 → Phase 9 → Phase 10 → Phase 11
> **Sprint 4 (Advanced Quant):** Phase 12 → Phase 13 → Phase 14 → Phase 15 → Phase 16
> **Sprint 5 (ML & Sim):** Phase 17 → Phase 18 → Phase 19 → Phase 20
> **Sprint 6 (Mastery):** Phase 21 → Phase 22 → Phase 23 → Phase 24 → Phase 25
> **Sprint 7 (Legendary):** Phase 26 → Phase 27 → Phase 28 → Phase 29
>
> *(Just go 1 through 29 in order. Done.)*

---

## Data Source Summary

| Source | Cost | What It Provides |
|--------|------|-----------------|
| ESPN APIs | Free | Schedules, scores, spreads, team info, live games |
| BallDontLie API | Free | Player stats, box scores, season averages |
| NBA Stats API | Free | Advanced stats, play-by-play, referee data |
| The Odds API | Free (500 req/mo) | Multi-book odds, line history |
| Basketball-Reference | Free (scrape) | Historical data, transactions, coaching trees |
| SportsData.io | $50/mo | Real-time injuries, lineups, projections |
| BigDataBall | $20 one-time | Historical closing lines for backtesting |
| X/Twitter API | $100/mo (Basic) | Real-time NBA insider tweets for NLP |
| pbpstats.com | Free | Historical referee statistics |
| OpenWeather API | Free | Weather data for travel/arena factors |

### Python Dependencies (All Free/Open Source)
| Package | Phase(s) | Purpose |
|---------|----------|---------|
| `hmmlearn` | 2.5 | Hidden Markov Models |
| `pymc` | 2.5, 11 | Bayesian MCMC inference |
| `xgboost` | 6 | Gradient-boosted prediction |
| `optuna` | 6 | Hyperparameter optimization |
| `scipy` | 2.5, 8, 19 | FFT, wavelets, matrix exponential, portfolio optimization |
| `pywt` | 8 | Advanced wavelet transforms |
| `transformers` | 9 | NLP sentiment analysis |
| `scikit-learn` | 6, 8, 20 | ML utilities, mutual information, cross-validation |
| `arviz` | 11 | Bayesian diagnostics |
| `torch` | 13 | DQN, PPO reinforcement learning |
| `networkx` | 15 | Graph analysis |
| `node2vec` | 15 | Graph embeddings |
| `sdv` | 16 | Synthetic data generation |
| `shap` | 21 | Meta-learner contribution analysis |
| `statsmodels` | 22 | Granger causality tests |
| `linearmodels` | 22 | Instrumental variable regression |
| `rich` | 23 | Terminal dashboard formatting (optional) |
| `arch` | 25 | GARCH volatility modeling |

---

## Jim Simons Methodology Reference

See [JIM_SIMONS_METHODOLOGY.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/JIM_SIMONS_METHODOLOGY.md) for the complete mapping of Renaissance Technologies techniques to each phase.

## All Phase Documents (Build Order)

| Phase | Document |
|-------|----------|
| 1 | [Data Quality](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_1_DATA_QUALITY.md) |
| 2 | [Dynamic Elo](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_2_DYNAMIC_ELO.md) |
| 3 | [Live Context](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_3_LIVE_CONTEXT.md) |
| 4 | [Markov Chains](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_4_MARKOV_CHAINS.md) |
| 5 | [Backtesting](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_5_BACKTESTING.md) |
| 6 | [Model Decay Detection](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_6_MODEL_DECAY.md) |
| 7 | [Operations Dashboard](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_7_OPERATIONS_DASHBOARD.md) |
| 8 | [Player Stats](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_8_PLAYER_STATS.md) |
| 9 | [H2H & Situational](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_9_H2H_SITUATIONAL.md) |
| 10 | [Market Intelligence](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_10_MARKET_INTELLIGENCE.md) |
| 11 | [Alternative Data](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_11_ALTERNATIVE_DATA.md) |
| 12 | [Signal Processing](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_12_SIGNAL_PROCESSING.md) |
| 13 | [NLP & Sentiment](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_13_NLP_SENTIMENT.md) |
| 14 | [Statistical Arbitrage](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_14_STAT_ARBITRAGE.md) |
| 15 | [Bayesian Inference](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_15_BAYESIAN_INFERENCE.md) |
| 16 | [Graph Analysis](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_16_GRAPH_ANALYSIS.md) |
| 17 | [Machine Learning](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_17_MACHINE_LEARNING.md) |
| 18 | [Meta-Learning (Stacking)](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_18_META_LEARNING.md) |
| 19 | [Information Theory](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_19_INFORMATION_THEORY.md) |
| 20 | [Simulation](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_20_SIMULATION.md) |
| 21 | [Causal Inference](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_21_CAUSAL_INFERENCE.md) |
| 22 | [Reinforcement Learning](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_22_REINFORCEMENT_LEARNING.md) |
| 23 | [Execution Infrastructure](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_23_EXECUTION.md) |
| 24 | [Portfolio Theory](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_24_PORTFOLIO_THEORY.md) |
| 25 | [Adversarial Robustness](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_25_ADVERSARIAL.md) |
| 26 | [Transfer Learning](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_26_TRANSFER_LEARNING.md) |
| 27 | [Decision Journal](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_27_DECISION_JOURNAL.md) |
| 28 | [Factor Investing](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_28_FACTOR_INVESTING.md) |
| 29 | [Reflexivity](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/PHASE_29_REFLEXIVITY.md) |
| — | [Deployment Checklist](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/ZZ_DEPLOYMENT_CHECKLIST.md) |
| — | [Frontend / Connector Checklist](file:///Users/amiritate/EARN/W3B/W3b_2.0/nba_engine_upgrade/backend/ZZ_FRONTEND_CONNECTOR_CHECKLIST.md) |

