# Phase 1: Dynamic Elo System
### *From Static Dictionary → Self-Learning Power Rankings*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🔴 Critical | **Estimated Effort:** 2-3 days | **Impact:** +15% prediction accuracy

---

## Overview

The `NBAEloModel` currently stores 30 hardcoded team ratings that never change. This phase replaces that static dictionary with a system that ingests every completed NBA game and automatically adjusts all 30 team ratings in real-time — exactly how FiveThirtyEight's model works.

## What Exists Today (Being Replaced)

```python
# elo_model.py — the entire "brain" right now
RATINGS = {
    "Boston Celtics": 1720.5,
    "Denver Nuggets": 1695.2,
    # ... 28 more hardcoded values that NEVER update
}
HOME_ADVANTAGE = 50.0  # flat for every team
```

**Problems:**
- Ratings are frozen from preseason — a team on a 15-game win streak still has its October rating
- Home court advantage is flat +50 for everyone — Denver at altitude should be +80, a tanking team should be +20
- No margin-of-victory weighting — a 1-point buzzer-beater and a 40-point blowout count the same

---

## Step 1.1 — Game Results Collector

### Objective
Build a service that polls ESPN every 30 minutes for completed NBA game scores and stores them in a PostgreSQL table.

### Implementation Details

#### File: `NEW → monolith/data/results_collector.py`

```
class NBAResultsCollector:
    """
    Polls ESPN Scoreboard API for final game results.
    Runs every 30 minutes via the engine's scheduler loop.
    """
```

#### ESPN API Endpoint
```
GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
```

#### Response Parsing Logic
1. Iterate over `data.events[]`
2. Filter for `status.type.completed == true`
3. Extract from each `competition`:
   - `competitors[0]` (home): `team.displayName`, `score`, `homeAway`
   - `competitors[1]` (away): `team.displayName`, `score`, `homeAway`
   - `date` (game date)
   - `id` (ESPN event ID — use as dedup key)

#### Database Schema
```sql
CREATE TABLE nba_game_results (
    id              SERIAL PRIMARY KEY,
    espn_event_id   VARCHAR(50) UNIQUE NOT NULL,     -- dedup key
    game_date       DATE NOT NULL,
    season          VARCHAR(10) NOT NULL,            -- "2025-26"
    home_team       VARCHAR(50) NOT NULL,
    away_team       VARCHAR(50) NOT NULL,
    home_score      INTEGER NOT NULL,
    away_score      INTEGER NOT NULL,
    margin          INTEGER NOT NULL,                -- home_score - away_score
    winner          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_results_date ON nba_game_results(game_date);
CREATE INDEX idx_results_team ON nba_game_results(home_team, away_team);
```

#### Scheduling
- Hook into the existing `SportsModelEnsemble._run_prediction_loop()` scheduler
- Run `collect_results()` every 30 minutes
- Only insert results not already in the database (dedup on `espn_event_id`)
- Log: `"Collected {n} new game results. Total: {total} for 2025-26 season."`

#### Edge Cases to Handle
- [ ] Games that go to overtime — margin is still just final score difference
- [ ] Postponed/cancelled games — skip any event where `status.type.name != "STATUS_FINAL"`
- [ ] All-Star game / preseason — filter by `season.type == 2` (regular season) or `3` (playoffs)
- [ ] Team name mismatches — ESPN uses `displayName` ("LA Clippers") which may differ from our Elo dictionary ("Los Angeles Clippers"). Build a name normalization map.

#### Team Name Normalization Map
```python
TEAM_ALIASES = {
    "LA Clippers": "Los Angeles Clippers",
    "LA Lakers": "Los Angeles Lakers",
    # ESPN sometimes uses abbreviations
    "Sixers": "Philadelphia 76ers",
    "Blazers": "Portland Trail Blazers",
}
```

### Verification
- [ ] Run collector manually → confirm it finds yesterday's completed games
- [ ] Check PostgreSQL → confirm rows are inserted with correct scores
- [ ] Run again → confirm no duplicates (dedup on `espn_event_id`)
- [ ] Check team names → confirm all 30 teams normalize correctly to Elo dictionary keys

---

## Step 1.2 — Elo Rating Auto-Updater

### Objective
After each new game result, apply the standard Elo update formula to both teams' ratings.

### Implementation Details

#### File: `MODIFY → monolith/strategies/prediction/elo_model.py`

#### The Elo Update Formula
```python
def update_ratings(home_team, away_team, home_won, margin, k_factor=20):
    """
    Standard Elo update after a completed game.
    
    Args:
        home_team: Name of home team
        away_team: Name of away team  
        home_won: True if home team won
        margin: Absolute point margin
        k_factor: Learning rate (higher = faster adjustment)
    """
    home_rating = get_current_rating(home_team)
    away_rating = get_current_rating(away_team)
    
    # Expected win probability (same formula as predict())
    expected_home = 1.0 / (1.0 + 10 ** ((away_rating - (home_rating + HOME_ADVANTAGE)) / 400))
    
    # Actual outcome: 1.0 = win, 0.0 = loss
    actual_home = 1.0 if home_won else 0.0
    
    # Elo update
    home_new = home_rating + k_factor * (actual_home - expected_home)
    away_new = away_rating + k_factor * ((1 - actual_home) - (1 - expected_home))
    
    save_rating(home_team, home_new)
    save_rating(away_team, away_new)
```

#### Adaptive K-Factor
The K-factor controls how much a single game moves the ratings:

| Context | K-Factor | Why |
|---------|----------|-----|
| Preseason | 10 | Games don't matter, small adjustments |
| Regular Season (games 1-20) | 25 | Early season, ratings still calibrating |
| Regular Season (games 21-82) | 20 | Standard learning rate |
| Playoffs | 30 | High-stakes games reveal true strength |
| Post All-Star Break | 22 | Teams make trades, rotations change |

```python
def get_k_factor(game_date, season_game_number, is_playoff=False):
    if is_playoff:
        return 30
    if season_game_number <= 20:
        return 25
    return 20
```

#### Database Schema — Rating History
```sql
CREATE TABLE nba_elo_history (
    id              SERIAL PRIMARY KEY,
    team            VARCHAR(50) NOT NULL,
    rating          FLOAT NOT NULL,
    rating_change   FLOAT NOT NULL,              -- delta from previous
    game_date       DATE NOT NULL,
    games_played    INTEGER NOT NULL,
    triggered_by    VARCHAR(50),                 -- espn_event_id that caused update
    season          VARCHAR(10) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_elo_team_date ON nba_elo_history(team, game_date);
```

#### Season-Start Regression
At the beginning of each new season, pull all teams 33% toward the league average (1500):
```python
def regress_to_mean(current_rating, regression_factor=0.33):
    """Applied once at season start."""
    return current_rating + regression_factor * (1500.0 - current_rating)
```

This prevents last year's champion from starting with an unfair advantage and gives bad teams a fresh-ish start.

#### Loading Order
1. On engine startup → load most recent rating for each team from `nba_elo_history`
2. If no history exists → fallback to the current static `RATINGS` dictionary as seed values
3. After each game result → update ratings in memory AND write new row to `nba_elo_history`

### Verification
- [ ] Process 10 real game results from last week → confirm ratings shift in correct direction
- [ ] Team that won should gain points, team that lost should lose points
- [ ] Upset win (underdog beats favorite) should cause a LARGER rating shift than expected win
- [ ] Ratings should still sum to approximately `30 * 1500 = 45000` (Elo is zero-sum)

---

## Step 1.3 — Margin-of-Victory Adjustment

### Objective
Weight rating changes by how dominant the win was. A 30-point blowout should move ratings more than a 1-point buzzer-beater.

### Implementation Details

#### File: `MODIFY → monolith/strategies/prediction/elo_model.py`

#### The MOV Multiplier (FiveThirtyEight Formula)
```python
def mov_multiplier(margin, winner_elo_diff):
    """
    Margin-of-Victory multiplier for Elo updates.
    
    Prevents blowouts against weak teams from over-inflating ratings
    by dampening the multiplier when the Elo gap is large.
    
    Args:
        margin: Absolute point margin of victory
        winner_elo_diff: Winner's Elo rating minus loser's Elo rating
    """
    import math
    return math.log(abs(margin) + 1) * (2.2 / (winner_elo_diff * 0.001 + 2.2))
```

#### How It Changes the Update
```python
# Before (flat K-factor):
home_new = home_rating + K * (actual - expected)

# After (MOV-weighted):
multiplier = mov_multiplier(margin, winner_elo - loser_elo)
home_new = home_rating + K * multiplier * (actual - expected)
```

#### Examples
| Game | Margin | Winner Elo Diff | MOV Multiplier | Effect |
|------|--------|----------------|----------------|--------|
| Celtics beat Wizards by 25 | 25 | +350 | 1.05 | Small boost (expected blowout) |
| Wizards beat Celtics by 5 | 5 | -350 | 2.85 | HUGE boost (massive upset) |
| Lakers beat Rockets by 3 | 3 | +20 | 1.38 | Normal boost (close matchup) |

### Verification
- [ ] Simulate: underdog wins by 20 → rating swing should be 2-3x larger than favorite winning by 20
- [ ] Simulate: favorite wins by 1 → rating swing should be minimal (expected win, close game)
- [ ] Verify multiplier never returns negative or zero

---

## Step 1.4 — Team-Specific Home Court Advantage

### Objective
Replace the flat +50 HCA with per-team values calculated from actual home/away win splits.

### Implementation Details

#### File: `MODIFY → monolith/strategies/prediction/elo_model.py`

#### Calculation
```python
def calculate_team_hca(team_name, results_df):
    """
    Calculate team-specific home court advantage from this season's results.
    
    Returns Elo-point adjustment (typically 20-80 range).
    """
    home_games = results_df[results_df.home_team == team_name]
    away_games = results_df[results_df.away_team == team_name]
    
    if len(home_games) < 5 or len(away_games) < 5:
        return 50.0  # Not enough data, use league average
    
    home_win_pct = (home_games.winner == team_name).mean()
    away_win_pct = (away_games.winner == team_name).mean()
    
    # Convert differential to Elo scale
    # 10% home/away split ≈ 30 Elo points
    hca = 50.0 + (home_win_pct - away_win_pct - 0.10) * 300
    
    # Clamp to reasonable range
    return max(20.0, min(100.0, hca))
```

#### Notable NBA HCA Values (Expected)
| Team | Expected HCA | Why |
|------|-------------|-----|
| Denver Nuggets | ~80 | 5,280 ft altitude, opponents struggle to breathe |
| Utah Jazz | ~75 | 4,226 ft altitude + hostile crowd |
| Golden State Warriors | ~60 | Electric home crowd, Chase Center |
| Tanking Teams | ~25-35 | Empty arenas, no crowd energy |
| League Average | ~50 | Baseline |

#### Recalculation Schedule
- Recalculate HCA values every Monday at 4 AM ET
- Requires minimum 10 home + 10 away games before using team-specific values
- Before that threshold, use league average (50.0)

### Verification
- [ ] After 30+ games per team, verify Denver/Utah have highest HCA values
- [ ] Verify tanking teams (Wizards, Pistons) have lowest HCA values
- [ ] Verify all values fall in the 20-100 Elo point range
- [ ] Compare prediction accuracy: flat HCA vs team-specific HCA over a 2-week window

---

## Integration Checklist

When all 4 steps are complete, the new `elo_model.py` should:

- [ ] Load ratings from PostgreSQL on startup (fall back to static dict if empty)
- [ ] Automatically update ratings after every completed game
- [ ] Use MOV-adjusted Elo updates (not flat win/loss)
- [ ] Use team-specific home court advantage (not flat 50)
- [ ] Store full rating history for analysis and backtesting
- [ ] Apply season-start regression when a new season begins
- [ ] Log all rating changes for debugging

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/data/results_collector.py` | NEW | Polls ESPN for completed game scores |
| `monolith/strategies/prediction/elo_model.py` | MODIFY | Dynamic ratings, MOV, team HCA |
| Database migration | NEW | `nba_game_results` + `nba_elo_history` tables |

## Dependencies
- PostgreSQL (already running on VPS as `monolith-questdb`)
- ESPN Scoreboard API (already integrated, free)
- No new paid APIs required
