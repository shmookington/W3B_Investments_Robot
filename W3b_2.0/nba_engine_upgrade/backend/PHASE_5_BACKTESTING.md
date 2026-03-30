# Phase 7: Historical Backtesting & Validation Framework
### *Prove It Works Before Risking Real Money*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🔴 Critical | **Estimated Effort:** 3-4 days | **Impact:** Risk management / go/no-go decision
> **Depends on:** Phases 1-4 minimum (can start backtesting before ML layer)

---

## Overview

Before placing a single real dollar based on the upgraded engine, we need mathematical proof that it would have been profitable across multiple NBA seasons. This phase builds the infrastructure to simulate our engine as if it were running live in the past, track every bet it would have made, and calculate the projected P&L.

**If backtesting shows positive results → go live.**
**If backtesting shows negative results → go back to Phases 1-6 and iterate.**

---

## Step 7.1 — Historical Data Collection

### Objective
Download 3-5 seasons of NBA game results, box scores, and closing odds for backtesting.

### File: `NEW → monolith/backtest/data_loader.py`

### Data Required

#### Game Results (3-5 seasons)
| Field | Source | Notes |
|-------|--------|-------|
| Date, home team, away team | Basketball-Reference | Free, easy to scrape |
| Final score, margin | Basketball-Reference | |
| Overtime (Y/N) | Basketball-Reference | |
| Season type (regular/playoff) | Basketball-Reference | |

#### Player Stats (3-5 seasons)
| Field | Source | Notes |
|-------|--------|-------|
| Per-player BPM, VORP, PER | Basketball-Reference | Seasonal averages |
| Minutes per game | Basketball-Reference | |
| Games played/missed | Basketball-Reference | For injury reconstruction |

#### Historical Closing Odds
| Field | Source | Notes |
|-------|--------|-------|
| Closing spread | BigDataBall ($20 one-time) | Most reliable source |
| Closing moneyline | BigDataBall | |
| Closing total | BigDataBall | |
| Opening spread | Covers.com (free scrape) | Less reliable but free |

#### Historical Injuries (Optional, +Accuracy)
| Field | Source | Notes |
|-------|--------|-------|
| Player injury logs | Basketball-Reference transactions | Dates of injuries/returns |
| Games missed per player | Basketball-Reference | |

### File Structure
```
monolith/backtest/data/
├── results/
│   ├── nba_2022_23.csv
│   ├── nba_2023_24.csv
│   ├── nba_2024_25.csv
│   └── nba_2025_26.csv
├── odds/
│   ├── closing_lines_2022_23.csv
│   ├── closing_lines_2023_24.csv
│   └── closing_lines_2024_25.csv
├── players/
│   ├── player_stats_2022_23.csv
│   └── ...
└── injuries/
    ├── injury_log_2022_23.csv
    └── ...
```

### Scraping Implementation
```python
class HistoricalDataLoader:
    """
    Downloads and cleans historical NBA data for backtesting.
    """
    
    async def download_season_results(self, season: str):
        """
        Scrape Basketball-Reference for complete season results.
        
        URL: https://www.basketball-reference.com/leagues/NBA_{year}_games.html
        """
        
    async def download_closing_lines(self, season: str):
        """
        Load historical closing lines from BigDataBall CSV export.
        Or scrape from covers.com/odds/basketball/nba/
        """
        
    def align_data(self, results_df, odds_df) -> pd.DataFrame:
        """
        Merge game results with closing odds.
        Match on: date + home_team + away_team
        Handle team name discrepancies between sources.
        """
```

### Verification
- [ ] Each season has 1,230 regular season games (30 teams × 82 games ÷ 2)
- [ ] Closing odds available for ≥90% of games when using BigDataBall
- [ ] No duplicate games in any season
- [ ] Team names are consistent across results, odds, and player data

---

## Step 7.2 — Walk-Forward Backtester

### Objective
Simulate the engine as if it were running live each day of each historical season. Use ONLY data available before each game (no lookahead bias).

### File: `NEW → monolith/backtest/walk_forward.py`

### Core Architecture
```python
class WalkForwardBacktester:
    """
    Simulates the engine running live day-by-day through a historical season.
    
    For each game day:
    1. Build feature vectors using only pre-game data
    2. Generate predictions and signals
    3. Apply position sizing (Kelly criterion)
    4. Record bet outcomes
    5. Track bankroll over time
    """
    
    def __init__(self, config: BacktestConfig):
        self.starting_bankroll = config.starting_bankroll  # e.g., $10,000
        self.max_bet_pct = config.max_bet_pct              # e.g., 0.05 (5%)
        self.min_edge = config.min_edge                    # e.g., 0.03 (3%)
        self.kelly_fraction = config.kelly_fraction        # e.g., 0.25 (quarter Kelly)
        
    def run_season(self, season: str) -> BacktestResult:
        """
        Walk through every game day in the season chronologically.
        """
        bankroll = self.starting_bankroll
        bets = []
        daily_bankroll = []
        
        for game_date in self.get_season_dates(season):
            games_today = self.get_games(game_date)
            
            for game in games_today:
                # Step 1: Build feature vector (only pre-game data)
                features = self.feature_pipeline.build_historical_features(
                    game.home_team, game.away_team, game_date
                )
                
                # Step 2: Generate prediction
                pred = self.model.predict_proba(features)  # Home win probability
                
                # Step 3: Calculate edge vs closing line
                closing_prob = self.get_closing_prob(game)
                edge = pred - closing_prob
                
                # Step 4: Only bet if edge exceeds minimum threshold
                if abs(edge) >= self.min_edge:
                    side = "home" if edge > 0 else "away"
                    bet_prob = pred if side == "home" else (1 - pred)
                    
                    # Kelly criterion position sizing
                    odds = self.get_closing_odds(game, side)  # American odds
                    decimal_odds = american_to_decimal(odds)
                    kelly = (bet_prob * decimal_odds - 1) / (decimal_odds - 1)
                    
                    bet_size = bankroll * min(kelly * self.kelly_fraction, self.max_bet_pct)
                    
                    # Step 5: Resolve bet
                    won = (side == "home" and game.home_won) or (side == "away" and not game.home_won)
                    
                    pnl = bet_size * (decimal_odds - 1) if won else -bet_size
                    bankroll += pnl
                    
                    bets.append(BetRecord(
                        date=game_date,
                        game=game,
                        side=side,
                        bet_size=bet_size,
                        odds=odds,
                        model_prob=bet_prob,
                        closing_prob=closing_prob,
                        edge=edge,
                        won=won,
                        pnl=pnl,
                        bankroll_after=bankroll,
                    ))
            
            daily_bankroll.append((game_date, bankroll))
        
        return BacktestResult(
            season=season,
            bets=bets,
            daily_bankroll=daily_bankroll,
            starting_bankroll=self.starting_bankroll,
            ending_bankroll=bankroll,
        )
```

### Metrics Calculated
```python
class BacktestResult:
    def summary(self) -> dict:
        return {
            # P&L
            "total_pnl": self.ending_bankroll - self.starting_bankroll,
            "roi_pct": (self.ending_bankroll / self.starting_bankroll - 1) * 100,
            
            # Bet stats
            "total_bets": len(self.bets),
            "bets_per_day": len(self.bets) / self.season_days,
            "win_rate": sum(b.won for b in self.bets) / len(self.bets),
            "avg_edge": np.mean([b.edge for b in self.bets]),
            "avg_odds": np.mean([b.odds for b in self.bets]),
            
            # CLV
            "avg_clv": np.mean([b.model_prob - b.closing_prob for b in self.bets]),
            "clv_positive_rate": sum(1 for b in self.bets if b.model_prob > b.closing_prob) / len(self.bets),
            
            # Risk
            "max_drawdown_pct": self._max_drawdown(),
            "sharpe_ratio": self._sharpe(),
            "longest_losing_streak": self._longest_streak(False),
            
            # Bankroll
            "peak_bankroll": max(b.bankroll_after for b in self.bets),
            "trough_bankroll": min(b.bankroll_after for b in self.bets),
        }
    
    def _max_drawdown(self) -> float:
        """Peak-to-trough percentage decline in bankroll."""
        peak = self.starting_bankroll
        max_dd = 0
        for date, bankroll in self.daily_bankroll:
            peak = max(peak, bankroll)
            dd = (peak - bankroll) / peak
            max_dd = max(max_dd, dd)
        return max_dd * 100
    
    def _sharpe(self) -> float:
        """Annualized Sharpe ratio of daily returns."""
        daily_returns = [
            (self.daily_bankroll[i][1] - self.daily_bankroll[i-1][1]) / self.daily_bankroll[i-1][1]
            for i in range(1, len(self.daily_bankroll))
        ]
        if np.std(daily_returns) == 0:
            return 0
        return np.mean(daily_returns) / np.std(daily_returns) * np.sqrt(252)
```

### Verification
- [ ] Run on 2024-25 season → produces complete bet log with daily P&L
- [ ] Verify no lookahead bias: each game uses only pre-game data
- [ ] Total bets should be 2-5 per game day (not betting every game)
- [ ] Bankroll chart should be plottable (matplotlib) for visual inspection

---

## Step 7.3 — Monte Carlo Simulation

### Objective
Answer: "If I start with $10,000, what's the realistic range of outcomes after 1 season?"

### File: `NEW → monolith/backtest/monte_carlo.py`

```python
class MonteCarloSimulator:
    """
    Runs 10,000 simulations using the model's probability outputs
    to calculate realistic bankroll distribution.
    """
    
    def simulate(self, backtest_result: BacktestResult, n_sims: int = 10000) -> MonteCarloResult:
        """
        For each simulation:
        1. Take the same bets with the same edges and odds
        2. Randomly resolve each bet using the model's probability
           (not the actual outcome — simulate the long-run)
        3. Track final bankroll
        """
        final_bankrolls = []
        
        for sim in range(n_sims):
            bankroll = backtest_result.starting_bankroll
            
            for bet in backtest_result.bets:
                # Simulate outcome using model probability
                won = random.random() < bet.model_prob
                
                decimal_odds = american_to_decimal(bet.odds)
                if won:
                    bankroll += bet.bet_size * (decimal_odds - 1)
                else:
                    bankroll -= bet.bet_size
            
            final_bankrolls.append(bankroll)
        
        return MonteCarloResult(
            median_bankroll=np.median(final_bankrolls),
            mean_bankroll=np.mean(final_bankrolls),
            p5_bankroll=np.percentile(final_bankrolls, 5),     # Worst 5%
            p25_bankroll=np.percentile(final_bankrolls, 25),   # Bad scenario
            p75_bankroll=np.percentile(final_bankrolls, 75),   # Good scenario
            p95_bankroll=np.percentile(final_bankrolls, 95),   # Best 5%
            probability_of_profit=sum(1 for b in final_bankrolls if b > backtest_result.starting_bankroll) / n_sims,
            probability_of_ruin=sum(1 for b in final_bankrolls if b < backtest_result.starting_bankroll * 0.5) / n_sims,
        )
```

### Output Example
```
Monte Carlo Results (10,000 simulations, $10,000 starting):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Median final bankroll:    $11,420 (+14.2%)
95th percentile (best):   $14,800 (+48.0%)
5th percentile (worst):   $7,950  (-20.5%)
Probability of profit:    72.3%
Probability of ruin (<50%): 2.1%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RECOMMENDATION: Model shows positive expected value.
   Risk of ruin is acceptable (< 5%).
   Proceed to paper trading.
```

### Verification
- [ ] 10,000 simulations complete in < 30 seconds
- [ ] Distribution looks normal/slightly right-skewed (not bimodal)
- [ ] Probability of profit > 60% with a legitimate model
- [ ] Probability of ruin < 5% with quarter-Kelly sizing

---

## Step 7.4 — Paper Trading Mode

### Objective
Run the fully upgraded engine in real-time for 2+ weeks, generating signals but NOT executing real bets. Track every signal and compare predictions to actual outcomes.

### File: `MODIFY → monolith/integration/paper_runner.py`

### How It Works
```python
class PaperTradingRunner:
    """
    Runs the full prediction pipeline in real-time but:
    - Does NOT place real bets
    - Logs every signal it WOULD have generated
    - After each game completes, records if the signal won or lost
    - Calculates rolling CLV and win rate
    """
    
    async def run_daily(self):
        """Run once per game day."""
        signals = await self.ensemble.generate_predictions()
        
        for signal in signals:
            self.paper_log.record_signal(signal)
            logger.info(
                f"📝 PAPER BET: {signal.event_title} | "
                f"Side: {signal.side} | "
                f"Model: {signal.model_probability:.1%} | "
                f"Market: {signal.market_price_cents/100:.1%} | "
                f"Edge: {signal.edge:.1%}"
            )
        
        # After games complete, resolve paper bets
        await self.resolve_completed_games()
    
    async def resolve_completed_games(self):
        """Check results for paper bets from today."""
        pending = self.paper_log.get_pending_signals()
        
        for signal in pending:
            result = await self.results_collector.get_game_result(signal.espn_event_id)
            if result:
                won = self._check_win(signal, result)
                self.paper_log.resolve(signal.signal_id, won, result.margin)
    
    def get_paper_report(self, days: int = 14) -> PaperReport:
        """
        Generate performance report for last N days of paper trading.
        """
        resolved = self.paper_log.get_resolved(days=days)
        
        return PaperReport(
            total_signals=len(resolved),
            win_rate=sum(r.won for r in resolved) / len(resolved),
            avg_edge=np.mean([r.edge for r in resolved]),
            avg_clv=np.mean([r.clv for r in resolved]),
            roi_if_flat_bet=self._calculate_flat_bet_roi(resolved),
            roi_if_kelly=self._calculate_kelly_roi(resolved),
            best_signal=max(resolved, key=lambda r: r.pnl_if_bet),
            worst_signal=min(resolved, key=lambda r: r.pnl_if_bet),
        )
```

### Database Schema
```sql
CREATE TABLE nba_paper_trades (
    id              SERIAL PRIMARY KEY,
    signal_id       VARCHAR(50) UNIQUE NOT NULL,
    espn_event_id   VARCHAR(50) NOT NULL,
    game_date       DATE NOT NULL,
    event_title     VARCHAR(200) NOT NULL,
    -- Signal data
    side            VARCHAR(10) NOT NULL,
    model_prob      FLOAT NOT NULL,
    market_prob     FLOAT NOT NULL,
    edge            FLOAT NOT NULL,
    confidence      VARCHAR(20),
    kelly_bet_size  FLOAT,                   -- What we WOULD have bet
    -- Resolution
    resolved        BOOLEAN DEFAULT false,
    won             BOOLEAN,
    actual_margin   INTEGER,
    closing_prob    FLOAT,
    clv             FLOAT,
    pnl_if_bet      FLOAT,                   -- Hypothetical P&L
    -- Meta
    created_at      TIMESTAMP DEFAULT NOW(),
    resolved_at     TIMESTAMP
);
```

### Go-Live Criteria
Paper trading must meet ALL of the following before switching to real money:

| Metric | Minimum Threshold | Why |
|--------|-------------------|-----|
| Signals tracked | ≥ 50 | Need statistical significance |
| Win rate on EXTREME signals | ≥ 55% | EXTREME should win more than half |
| Average CLV | > +1.0 cents | Must beat closing line |
| CLV positive rate | > 52% | More signals beat close than don't |
| ROI (flat bet simulation) | > +2% | Must be profitable net of vig |
| Max drawdown (simulated) | < 15% | Bankroll risk must be manageable |
| Consecutive losing days | < 5 | Can't have week-long cold streaks |

```python
def check_go_live_criteria(report: PaperReport) -> bool:
    """Returns True if all criteria are met."""
    return (
        report.total_signals >= 50 and
        report.extreme_win_rate >= 0.55 and
        report.avg_clv > 0.01 and
        report.clv_positive_rate > 0.52 and
        report.roi_flat_bet > 0.02 and
        report.max_drawdown < 0.15 and
        report.max_consecutive_losses < 5
    )
```

### Verification
- [ ] Paper trading runs for 14+ days without crashing
- [ ] All signals are correctly resolved after games complete
- [ ] Paper report generates with all metrics calculated
- [ ] Go-live criteria function returns correct pass/fail

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/backtest/data_loader.py` | NEW | Historical data download & cleaning |
| `monolith/backtest/walk_forward.py` | NEW | Day-by-day historical simulation |
| `monolith/backtest/monte_carlo.py` | NEW | 10,000 bankroll simulations |
| `monolith/integration/paper_runner.py` | MODIFY | Real-time paper trading with resolution |
| Database migration | NEW | `nba_paper_trades` table |

## Dependencies
- BigDataBall historical odds ($20 one-time) OR Covers.com scrape (free)
- Basketball-Reference (free scraping)
- Phase 1 minimum (dynamic Elo), ideally Phases 1-5 for full feature testing
- Python packages: `numpy`, `pandas`, `matplotlib` (all already installed)

## Order of Operations
1. Download historical data (Step 7.1) — can do immediately
2. Build walk-forward backtester (Step 7.2) — after Phase 1 is complete
3. Run Monte Carlo (Step 7.3) — after backtester produces results
4. Start paper trading (Step 7.4) — after Phase 2 is complete at minimum
5. Go-live decision — after 2+ weeks of positive paper trading results
