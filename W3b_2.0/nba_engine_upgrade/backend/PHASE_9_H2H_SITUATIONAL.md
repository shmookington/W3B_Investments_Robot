# Phase 4: Head-to-Head & Situational Analysis
### *Matchup History, Revenge Games, Letdown Spots, and Look-Aheads*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🟡 High | **Estimated Effort:** 2-3 days | **Impact:** +5% on rivalry/situational games
> **Depends on:** Phase 1 (Game Results Database)

---

## Overview

Some teams consistently beat certain opponents regardless of overall strength — the Celtics-Sixers rivalry produces different results than a neutral rating would predict. This phase captures matchup-specific and situational patterns that Elo alone misses.

---

## Step 4.1 — Head-to-Head Record Tracker

### Objective
Track all matchups between every pair of teams for the current + previous 3 seasons. If Team A has a dominant H2H record against Team B, apply a small adjustment.

### File: `NEW → monolith/data/h2h_tracker.py`

### Database Schema
```sql
CREATE TABLE nba_h2h_records (
    id              SERIAL PRIMARY KEY,
    team_a          VARCHAR(50) NOT NULL,
    team_b          VARCHAR(50) NOT NULL,
    season          VARCHAR(10) NOT NULL,
    team_a_wins     INTEGER DEFAULT 0,
    team_b_wins     INTEGER DEFAULT 0,
    team_a_avg_margin FLOAT DEFAULT 0.0,
    team_b_avg_margin FLOAT DEFAULT 0.0,
    games_played    INTEGER DEFAULT 0,
    last_game_date  DATE,
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_a, team_b, season)
);
```

### Core Logic
```python
class NBAH2HTracker:
    def get_h2h_adjustment(self, team_a: str, team_b: str) -> float:
        """
        Calculate H2H adjustment based on recent matchup history.
        
        Uses last 3 seasons of head-to-head data.
        More recent seasons weighted higher.
        """
        records = self._get_h2h_records(team_a, team_b, seasons=3)
        
        if not records or sum(r.games_played for r in records) < 4:
            return 0.0  # Not enough data
        
        # Weighted win rate (current season 3x, last season 2x, two ago 1x)
        weights = {0: 3.0, 1: 2.0, 2: 1.0}  # 0 = current season
        
        weighted_wins = 0
        weighted_games = 0
        
        for i, record in enumerate(records):
            w = weights.get(i, 1.0)
            weighted_wins += record.team_a_wins * w
            weighted_games += record.games_played * w
        
        if weighted_games == 0:
            return 0.0
        
        win_rate = weighted_wins / weighted_games
        
        # Convert to adjustment: 0.50 = neutral, 0.75 = +15, 0.25 = -15
        adjustment = (win_rate - 0.5) * 60  # Scale: ±30 max
        
        return max(-25, min(25, adjustment))
```

### Example
```
Boston Celtics vs Philadelphia 76ers:
- 2025-26: Celtics 3-1 (weight 3x) → 9 weighted wins / 12 weighted games
- 2024-25: Celtics 3-1 (weight 2x) → 6 / 8
- 2023-24: Celtics 2-2 (weight 1x) → 2 / 4
- Weighted win rate: 17/24 = 0.708
- Adjustment: (0.708 - 0.5) × 60 = +12.5 Elo for Celtics vs Sixers
```

### Data Source
- Pull from `nba_game_results` table (Phase 1)
- No additional API calls needed

### Verification
- [ ] Check known rivalries have expected H2H skews
- [ ] Verify adjustment is symmetric: if Celtics get +12.5 vs Sixers, Sixers get -12.5 vs Celtics
- [ ] Verify max adjustment is capped at ±25 Elo

---

## Step 4.2 — Division & Conference Familiarity

### Objective
Teams in the same division play 4 times per season (vs 2 times for non-division opponents). More familiarity can reduce variance and make predictions more reliable.

### File: `MODIFY → monolith/data/h2h_tracker.py`

### NBA Divisions
```python
DIVISIONS = {
    "Atlantic": ["Boston Celtics", "Brooklyn Nets", "New York Knicks", 
                 "Philadelphia 76ers", "Toronto Raptors"],
    "Central": ["Chicago Bulls", "Cleveland Cavaliers", "Detroit Pistons",
                "Indiana Pacers", "Milwaukee Bucks"],
    "Southeast": ["Atlanta Hawks", "Charlotte Hornets", "Miami Heat",
                  "Orlando Magic", "Washington Wizards"],
    "Northwest": ["Denver Nuggets", "Minnesota Timberwolves", "Oklahoma City Thunder",
                  "Portland Trail Blazers", "Utah Jazz"],
    "Pacific": ["Golden State Warriors", "Los Angeles Clippers", "Los Angeles Lakers",
                "Phoenix Suns", "Sacramento Kings"],
    "Southwest": ["Dallas Mavericks", "Houston Rockets", "Memphis Grizzlies",
                  "New Orleans Pelicans", "San Antonio Spurs"],
}
```

### Adjustment Logic
```python
def get_familiarity_factor(team_a, team_b):
    """
    Division rivals know each other better → predictions slightly more reliable.
    Apply a small confidence boost (not an Elo adjustment).
    """
    if same_division(team_a, team_b):
        return {"confidence_boost": 0.05, "elo_adjustment": 0}
    elif same_conference(team_a, team_b):
        return {"confidence_boost": 0.02, "elo_adjustment": 0}
    return {"confidence_boost": 0, "elo_adjustment": 0}
```

---

## Step 4.3 — Situational Spot Detection

### Objective
Identify specific NBA scheduling/emotional situations that historically affect performance. These are well-studied patterns in sports analytics.

### File: `NEW → monolith/models/situational_model.py`

### Situation Catalog

#### 4.3.1 — Look-Ahead Spot
**Definition:** A team plays a weak opponent today, but faces a marquee opponent tomorrow or the next day.
```python
def detect_look_ahead(team, game_date, opponent, next_opponent):
    """
    Look-ahead if:
    1. Today's opponent is weak (bottom 10 in ratings)
    2. Next game is against a top-10 opponent within 2 days
    3. Team is not on a losing streak (losing teams don't look ahead)
    """
    if (get_rating(opponent) < 1480 and 
        get_rating(next_opponent) > 1600 and
        days_until_next_game(team, game_date) <= 2 and
        current_streak(team) > -3):
        return -12  # Historically, favorites underperform by ~2-3 points
    return 0
```

#### 4.3.2 — Letdown Spot
**Definition:** Team just had a big emotional win (beat a top-5 team at home) and now plays an average/bad opponent.
```python
def detect_letdown(team, game_date, opponent, last_game_result):
    """
    Letdown if:
    1. Last game was a win against a top-10 opponent
    2. The win was at home (extra emotional high)
    3. Today's opponent is below average (rating < 1520)
    4. Today's game is away (traveling after emotional high)
    """
    if (last_game_result.won and
        get_rating(last_game_result.opponent) > 1600 and
        last_game_result.was_home and
        get_rating(opponent) < 1520 and
        not is_home(team, game_date)):
        return -10  # Historically underperform by ~1.5-2 points
    return 0
```

#### 4.3.3 — Revenge Spot
**Definition:** Team lost to this specific opponent by 15+ points in their last meeting.
```python
def detect_revenge(team, opponent, h2h_records):
    """
    Revenge if:
    1. Last H2H meeting was a loss by 15+ points
    2. That loss was within the last 60 days (still fresh)
    """
    last_meeting = get_last_h2h_game(team, opponent)
    if (last_meeting and
        not last_meeting.won and
        abs(last_meeting.margin) >= 15 and
        (game_date - last_meeting.date).days <= 60):
        return +10  # Teams tend to come out fired up in revenge spots
    return 0
```

#### 4.3.4 — Trap Game
**Definition:** A good team plays a bad team sandwiched between two games against good teams.
```python
def detect_trap_game(team, game_date, opponent, prev_opponent, next_opponent):
    """
    Trap game if:
    1. Team is good (rating > 1600)
    2. Today's opponent is bad (rating < 1480)
    3. Previous game was against a good team (rating > 1580)
    4. Next game is against a good team (rating > 1580)
    """
    if (get_rating(team) > 1600 and
        get_rating(opponent) < 1480 and
        get_rating(prev_opponent) > 1580 and
        get_rating(next_opponent) > 1580):
        return -8  # Good teams historically lose focus in trap games
    return 0
```

#### 4.3.5 — Road Trip Fatigue
**Definition:** Teams on game 4+ of a road trip historically underperform.
```python
def detect_road_trip_fatigue(team, game_date):
    """
    Check how many consecutive away games the team has played.
    """
    consecutive_away = count_consecutive_away_games(team, game_date)
    
    if consecutive_away >= 5:
        return -20  # Long road trips are brutal
    elif consecutive_away >= 4:
        return -12
    elif consecutive_away >= 3:
        return -5
    return 0
```

### Stacking Rule
Situations can stack, but cap total situational adjustment at ±25:
```python
def get_total_situational_adjustment(team, game_date, opponent):
    adjustments = [
        detect_look_ahead(team, game_date, opponent, get_next_opponent(team, game_date)),
        detect_letdown(team, game_date, opponent, get_last_result(team, game_date)),
        detect_revenge(team, opponent, get_h2h(team, opponent)),
        detect_trap_game(team, game_date, opponent, ...),
        detect_road_trip_fatigue(team, game_date),
    ]
    total = sum(adjustments)
    return max(-25, min(25, total))  # Hard cap
```

### Verification
- [ ] Backtest look-ahead spots across 2 seasons → good teams should ATS underperform by 1-3 points
- [ ] Backtest revenge games → teams should ATS overperform by 1-2 points
- [ ] Verify no single game gets more than ±25 total situational adjustment
- [ ] Compare: predictions with situational factors vs without over a 1-month window

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/data/h2h_tracker.py` | NEW | Head-to-head records with weighted win rates |
| `monolith/models/situational_model.py` | NEW | Look-ahead, letdown, revenge, trap game detection |
| `monolith/strategies/prediction/sports_ensemble.py` | MODIFY | Wire in H2H and situational adjustments |
| Database migration | NEW | `nba_h2h_records` table |

## Dependencies
- Phase 1 (need `nba_game_results` for H2H data and schedule context)
- ESPN Schedule API (already integrated) for next-game detection
- No paid APIs required
