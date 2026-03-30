# Phase 23: Real-Time Operations Dashboard
### *The War Room — Monitoring Every Signal, Model, and Dollar in Production*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech had a 24/7 war room where dozens of PhDs monitored every model, every signal, and every position. Nothing ran unattended. We build a real-time dashboard that gives you instant visibility into model health, active signals, P&L, and system status — all in one place.
> **Priority:** 🔴 Critical | **Estimated Effort:** 4-5 days | **Impact:** Prevents blind trading + enables instant response to problems

---

## Overview

You can't manage what you can't see. Phases 1-22 build a world-class prediction engine. Phase 23 ensures you can **monitor it in production** — detecting problems, tracking performance, and making informed decisions without digging through logs or databases.

---

## Step 23.1 — Model Health Monitor

### File: `NEW → monolith/dashboard/model_health.py`

```python
class ModelHealthMonitor:
    """
    Continuous monitoring of every model's calibration, accuracy, and stability.
    
    Displayed metrics (updated after every game resolves):
    ┌─────────────────────────────────────────────────────┐
    │  MODEL HEALTH DASHBOARD                             │
    ├─────────────────────────────────────────────────────┤
    │  Dynamic Elo     │ Brier: 0.208 │ Status: ✅ HEALTHY │
    │  HMM Regime      │ Brier: 0.215 │ Status: ✅ HEALTHY │
    │  XGBoost         │ Brier: 0.195 │ Status: ✅ HEALTHY │
    │  Bayesian MCMC   │ Brier: 0.210 │ Status: ⚠️ DRIFT  │
    │  Meta-Learner    │ Brier: 0.188 │ Status: ✅ HEALTHY │
    │  Live Chain      │ LogLoss: 0.42│ Status: ✅ HEALTHY │
    ├─────────────────────────────────────────────────────┤
    │  Last retrain: 3 days ago                           │
    │  Next scheduled retrain: Monday 4 AM ET             │
    │  Feature drift detected: None                       │
    │  Signal decay warning: momentum_10 (half-life: 2mo) │
    └─────────────────────────────────────────────────────┘
    """
    
    def get_health_snapshot(self) -> dict:
        return {
            model_name: {
                "brier_score": self._get_rolling_brier(model_name, window=50),
                "baseline_brier": self._get_baseline_brier(model_name),
                "degradation_pct": self._get_degradation(model_name),
                "status": self._classify_health(model_name),
                "last_correct": self._last_correct_prediction(model_name),
                "calibration_curve": self._get_calibration_data(model_name),
            }
            for model_name in self.MODELS
        }
```

---

## Step 23.2 — Live Signal Feed

```python
class LiveSignalFeed:
    """
    Real-time display of tonight's active signals.
    
    ┌──────────────────────────────────────────────────────────────┐
    │  TONIGHT'S SIGNALS  (3 active / 2 pending)                  │
    ├──────────────────────────────────────────────────────────────┤
    │  🟢 BOS -4.5 vs NYK  │ Edge: 6.2% │ Conf: HIGH │ Meta: XGB │
    │     Model: 68.2% │ Market: 62.0% │ CLV target: +2.5¢      │
    │     Placed: DK $150 + FD $100 │ Timing: OPTIMAL            │
    │                                                              │
    │  🟡 LAL ML vs SAC    │ Edge: 4.1% │ Conf: MED  │ Meta: Elo │
    │     Model: 57.1% │ Market: 53.0% │ CLV target: +1.8¢      │
    │     Status: WAITING (DQN says bet in 45 min)                │
    │                                                              │
    │  🔴 LIVE: DEN vs UTA │ Q3 4:12 │ DEN up 8                  │
    │     Chain: 81.2% │ Market: 74.0% │ Edge: 7.2%              │
    │     Alert sent via Telegram ✓                                │
    ├──────────────────────────────────────────────────────────────┤
    │  Portfolio exposure: 8.2% of bankroll │ Correlation risk: LOW│
    │  Tonight's expected EV: +$47.20                              │
    └──────────────────────────────────────────────────────────────┘
    """
```

---

## Step 23.3 — P&L Tracker

```python
class PnLTracker:
    """
    Track profit and loss with full analytics.
    
    ┌────────────────────────────────────────────────────────┐
    │  P&L SUMMARY                                          │
    ├────────────────────────────────────────────────────────┤
    │  Today:     +$82.50  (3W-1L)                          │
    │  This week: +$215.00 (12W-7L, +3.2% ROI)             │
    │  This month:+$890.00 (51W-34L, +4.1% ROI)            │
    │  Season:   +$3,240   (178W-122L, +3.8% ROI)          │
    ├────────────────────────────────────────────────────────┤
    │  CLV avg:   +1.8¢ (positive = real edge confirmed)    │
    │  Sharpe:    1.42                                      │
    │  Max DD:    -$620 (Jan 12-18)                         │
    │  Kelly util: 0.23 (conservative, good)                │
    ├────────────────────────────────────────────────────────┤
    │  By signal type:                                      │
    │    High conf:  +$1,800 (62% win rate)                 │
    │    Med conf:   +$1,100 (57% win rate)                 │
    │    Live:       +$340   (59% win rate)                 │
    │  By time of bet:                                      │
    │    Morning:    +$900  (best: lines are stale)         │
    │    Afternoon:  +$1,200                                │
    │    Pre-tip:    +$1,140                                │
    └────────────────────────────────────────────────────────┘
    """
    
    def get_pnl_summary(self, period: str = "season") -> dict:
        bets = self._get_resolved_bets(period)
        return {
            "total_pnl": sum(b.pnl for b in bets),
            "roi_pct": sum(b.pnl for b in bets) / sum(b.amount for b in bets) * 100,
            "win_rate": sum(1 for b in bets if b.won) / len(bets),
            "avg_clv": np.mean([b.clv for b in bets]),
            "sharpe": self._calculate_sharpe(bets),
            "max_drawdown": self._max_drawdown(bets),
            "kelly_utilization": self._avg_kelly_util(bets),
            "by_confidence": self._group_by_confidence(bets),
            "by_signal_type": self._group_by_signal_type(bets),
            "by_time_of_day": self._group_by_time(bets),
            "by_book": self._group_by_book(bets),
        }
```

---

## Step 23.4 — System Status & Alerting

```python
class SystemStatusMonitor:
    """
    Monitor all data feeds, APIs, and infrastructure.
    
    ┌──────────────────────────────────────────────────┐
    │  SYSTEM STATUS                                   │
    ├──────────────────────────────────────────────────┤
    │  ESPN API:        ✅ 200ms avg │ Last: 2 min ago │
    │  NBA Stats API:   ✅ 350ms avg │ Last: 5 min ago │
    │  The Odds API:    ✅ 180ms avg │ Last: 1 min ago │
    │  BallDontLie:     ⚠️ 900ms avg │ Last: 15min ago │
    │  Injury Feed:     ✅ Updated    │ Last: 30min ago │
    │  PostgreSQL:      ✅ Connected  │ 2.4 GB used     │
    │  HMM Model:       ✅ Loaded     │ Trained: 3d ago │
    │  XGBoost Model:   ✅ Loaded     │ Trained: 1d ago │
    │  Web App Link:    ✅ Attached   │ Connections: 4  │
    ├──────────────────────────────────────────────────┤
    │  ALERTS (last 24h):                              │
    │  ⚠️ 14:22 BallDontLie response slow (>800ms)    │
    │  ✅ 04:01 Weekly model retrain complete          │
    │  ✅ 02:30 Data quality check passed              │
    └──────────────────────────────────────────────────┘
    """
    
    MONITORS = {
        "espn_api": {"url": "site.api.espn.com", "max_latency_ms": 500, "max_staleness_min": 5},
        "nba_stats": {"url": "stats.nba.com", "max_latency_ms": 800, "max_staleness_min": 15},
        "odds_api": {"url": "api.the-odds-api.com", "max_latency_ms": 400, "max_staleness_min": 3},
        "balldontlie": {"url": "api.balldontlie.io", "max_latency_ms": 600, "max_staleness_min": 30},
        "postgres": {"type": "db", "max_connections": 20},
    }
    
    async def check_all(self) -> dict:
        results = {}
        for name, config in self.MONITORS.items():
            try:
                start = time.time()
                response = await self._ping(config)
                latency = (time.time() - start) * 1000
                
                results[name] = {
                    "status": "healthy" if latency < config["max_latency_ms"] else "degraded",
                    "latency_ms": latency,
                    "last_data_age_min": self._data_age(name),
                }
            except Exception as e:
                results[name] = {"status": "down", "error": str(e)}
                
        return results
```

---

## Step 23.5 — Native JSON API Router

```python
class DashboardAPIRouter:
    """
    Exposes system analytics to the Next.js Frontend.
    
    Endpoints:
    GET /api/dashboard/status   → JSON of System health summary
    GET /api/dashboard/signals  → JSON of Tonight's active advisory signals  
    GET /api/dashboard/pnl      → JSON of Kalshi Win/Loss record
    GET /api/dashboard/models   → JSON of Dynamic Elo Brier Score decay reports
    """
```

---

## Dependencies
- FastAPI or Flask (for the backend router)
- PostgreSQL (already integrated)
- `rich` (optional, for offline terminal formatting)
- Frontend integration: add `/dashboard` route to the existing Next.js app
