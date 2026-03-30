# Phase 2: Live Context Feeds
### *Injuries, Rest Days, Travel Fatigue, and Momentum*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🔴 Critical | **Estimated Effort:** 3-5 days | **Impact:** +25% accuracy on injury-affected games

---

## Overview

The single biggest factor that separates our Elo model from Vegas is **context awareness**. When LeBron James is ruled OUT 2 hours before tip-off, Vegas instantly moves the line 5-7 points. Our model doesn't even know he exists. This phase adds four real-time context layers.

---

## Step 2.1 — Injury Report Integration

### Objective
Maintain a live database of every NBA player's injury status and translate "Player X is OUT" into a measurable Elo adjustment for their team.

### Data Sources (In Priority Order)

#### Option A: ESPN Injuries API (Free)
```
GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries
```
- Returns current injuries by team
- Fields: `athlete.displayName`, `status` (Out, Day-To-Day, Questionable), `details`
- **Pros:** Free, already using ESPN
- **Cons:** Sometimes delayed 1-2 hours vs official reports

#### Option B: NBA Official Injury Reports (Free, Scrape)
```
GET https://official.nba.com/injury-report/
```
- Published daily at 5:00 PM ET (must be submitted by teams by 1:00 PM ET for evening games)
- Most authoritative source
- **Pros:** Official, definitive
- **Cons:** Requires HTML scraping, only updates once daily

#### Option C: SportsData.io API ($50/month)
```
GET https://api.sportsdata.io/v3/nba/scores/json/InjuredPlayers?key={API_KEY}
```
- Real-time injury feed with player impact metrics
- **Pros:** Fastest updates, includes projected impact
- **Cons:** Costs $50/month

### Implementation Details

#### File: `NEW → monolith/data/injury_tracker.py`

```
class NBAInjuryTracker:
    """
    Tracks player injury statuses and calculates team-level
    Elo adjustments based on who is missing.
    """
```

#### Core Methods
```python
async def fetch_injuries(self) -> List[PlayerInjury]:
    """Poll ESPN injuries endpoint."""
    
def get_team_injury_adjustment(self, team_name: str) -> float:
    """
    Calculate total Elo point adjustment for a team based on
    who is OUT/DOUBTFUL/QUESTIONABLE.
    
    Returns negative number (e.g., -120 if a superstar is OUT).
    """

def get_player_impact(self, player_name: str) -> float:
    """
    Estimate a player's Elo impact using their BPM (Box Plus/Minus).
    
    Rough tiers:
    - MVP-level (BPM > 8.0): -150 Elo when OUT
    - All-Star (BPM 4.0-8.0): -80 Elo when OUT
    - Starter (BPM 1.0-4.0): -40 Elo when OUT
    - Rotation player (BPM -1.0-1.0): -15 Elo when OUT
    - End of bench (BPM < -1.0): -5 Elo when OUT
    """
```

#### Player Impact Tiers
| Tier | BPM Range | Example Players | Elo Impact (OUT) | Elo Impact (DOUBTFUL) | Elo Impact (QUESTIONABLE) |
|------|-----------|----------------|-------------------|----------------------|--------------------------|
| MVP | > 8.0 | Jokic, Luka, Giannis | -150 | -100 | -50 |
| All-Star | 4.0 - 8.0 | Jaylen Brown, SGA, Towns | -80 | -55 | -25 |
| Quality Starter | 1.0 - 4.0 | Most starters | -40 | -25 | -12 |
| Rotation | -1.0 - 1.0 | 6th-8th man | -15 | -10 | -5 |
| Bench | < -1.0 | Deep bench | -5 | -3 | -1 |

#### Status Multipliers
```python
STATUS_MULTIPLIER = {
    "Out": 1.0,           # Definitely missing
    "Doubtful": 0.75,     # 75% likely to miss
    "Questionable": 0.40, # 40% likely to miss
    "Probable": 0.10,     # 10% likely to miss
    "Day-To-Day": 0.50,   # Coin flip
    "Suspended": 1.0,     # Definitely missing
}
```

#### Database Schema
```sql
CREATE TABLE nba_injuries (
    id              SERIAL PRIMARY KEY,
    player_name     VARCHAR(100) NOT NULL,
    team            VARCHAR(50) NOT NULL,
    status          VARCHAR(30) NOT NULL,        -- Out, Questionable, etc.
    injury_detail   VARCHAR(200),                -- "Left ankle sprain"
    estimated_bpm   FLOAT DEFAULT 0.0,           -- Player's BPM rating
    elo_adjustment  FLOAT DEFAULT 0.0,           -- Calculated impact
    game_date       DATE NOT NULL,
    source          VARCHAR(30) DEFAULT 'espn',
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_name, game_date)
);
```

#### Stacking Rule
When multiple players are out, adjustments stack but with diminishing returns:
```python
def calculate_total_adjustment(individual_adjustments: List[float]) -> float:
    """
    Stack injury impacts with diminishing returns.
    First injury = 100%, second = 80%, third = 60%, etc.
    
    Prevents unrealistic -400 Elo adjustments when 5 guys are out.
    """
    sorted_impacts = sorted(individual_adjustments, key=abs, reverse=True)
    total = 0
    for i, impact in enumerate(sorted_impacts):
        diminishing = max(0.3, 1.0 - (i * 0.2))  # 1.0, 0.8, 0.6, 0.4, 0.3, 0.3...
        total += impact * diminishing
    return max(-300, total)  # Hard cap at -300 Elo
```

#### Refresh Schedule
- Poll ESPN injuries API every **15 minutes** during game days (after 1 PM ET)
- Store snapshot for each game date
- Clear/refresh at midnight ET for next day's games

### Verification
- [ ] Manually check: when LeBron is listed as OUT, Lakers should lose ~150 Elo points
- [ ] Verify stacking: 3 rotation players OUT should be ~-50 total (not -45 without diminishing)
- [ ] Cross-reference with Vegas: when our adjustment flips the predicted winner, does Vegas agree?

---

## Step 2.2 — Rest & Fatigue Model

### Objective
Track how much rest each team has had, penalize back-to-backs and heavy travel, and reward well-rested teams.

### Implementation Details

#### File: `NEW → monolith/data/fatigue_model.py`

#### Core Logic
```python
class NBAFatigueModel:
    def get_rest_adjustment(self, team_name: str, game_date: date) -> float:
        """
        Calculate Elo adjustment based on rest and travel.
        
        Returns:
            Positive = well-rested advantage
            Negative = fatigue penalty
        """
        days_rest = self._days_since_last_game(team_name, game_date)
        travel_miles = self._travel_distance(team_name, game_date)
        schedule_density = self._games_in_last_n_days(team_name, game_date, n=7)
        
        adjustment = 0.0
        
        # Rest days impact
        if days_rest == 0:
            adjustment -= 35  # Back-to-back: significant penalty
        elif days_rest == 1:
            adjustment += 0   # Normal rest: no adjustment
        elif days_rest == 2:
            adjustment += 10  # Extra rest: slight advantage
        elif days_rest >= 3:
            adjustment += 15  # Extended rest (All-Star break, etc.)
        
        # Schedule density (3+ games in 4 nights)
        if schedule_density >= 4:
            adjustment -= 25  # 4 in 7 nights: heavy fatigue
        elif schedule_density >= 3:
            adjustment -= 10  # 3 in 7 nights: moderate fatigue
        
        # Travel penalty
        if travel_miles > 2000:
            adjustment -= 15  # Cross-country trip
        elif travel_miles > 1000:
            adjustment -= 8   # Long trip
        elif travel_miles > 500:
            adjustment -= 3   # Short trip
        
        return adjustment
```

#### NBA City Coordinates (for travel distance)
```python
CITY_COORDS = {
    "Boston Celtics": (42.3601, -71.0589),
    "Los Angeles Lakers": (34.0522, -118.2437),
    "Miami Heat": (25.7617, -80.1918),
    "Denver Nuggets": (39.7392, -104.9903),
    "Portland Trail Blazers": (45.5152, -122.6784),
    # ... all 30 teams
}
```

Travel distance = haversine formula between previous game city and current game city.

#### Rest Differential
The most powerful predictor isn't absolute rest — it's the **differential** between the two teams:
```python
def get_rest_differential_adjustment(home_rest_adj, away_rest_adj):
    """
    If one team is on a B2B and the other had 3 days off,
    the rested team gets a massive advantage.
    """
    return (home_rest_adj - away_rest_adj) * 0.5
```

Example: Home team on B2B (-35) vs Away team with 3 days rest (+15) = differential of 50 Elo points in favor of the away team.

#### Data Source
- ESPN Schedule API (already integrated): `/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD`
- Use `nba_game_results` table from Phase 1 to look up previous games

### Verification
- [ ] Backtest: teams on B2B should win ~5% less than their rating suggests
- [ ] Verify: rest differential correctly identifies "trap games" (rested underdog vs tired favorite)
- [ ] Check: travel distance calculation gives ~2,400 miles for Boston → LA

---

## Step 2.3 — Recent Form / Momentum Tracker

### Objective
Detect when a team is playing significantly better or worse than their season-long rating suggests, and apply a temporary adjustment.

### Implementation Details

#### File: `NEW → monolith/data/momentum_tracker.py`

#### Core Logic
```python
class NBAMomentumTracker:
    def get_momentum_adjustment(self, team_name: str, game_date: date) -> float:
        """
        Calculate momentum adjustment based on recent performance
        vs expected performance.
        
        Uses last 10 games with exponential decay (recent games weighted more).
        """
        recent_games = self._get_last_n_games(team_name, game_date, n=10)
        
        if len(recent_games) < 5:
            return 0.0  # Not enough data
        
        # Calculate weighted performance
        # Each game is weighted by recency: most recent = 1.0, oldest = 0.5
        weighted_margin_sum = 0
        weight_sum = 0
        
        for i, game in enumerate(recent_games):  # most recent first
            weight = 0.5 + 0.5 * ((len(recent_games) - i) / len(recent_games))
            weighted_margin_sum += game.margin * weight  # positive = won by X
            weight_sum += weight
        
        avg_weighted_margin = weighted_margin_sum / weight_sum
        
        # Convert weighted margin to Elo adjustment
        # +5 avg margin → +15 Elo (team is overperforming)
        # -5 avg margin → -15 Elo (team is underperforming)
        adjustment = avg_weighted_margin * 3.0
        
        # Cap at ±40 to prevent overreaction
        return max(-40, min(40, adjustment))
```

#### Regime Change Detection
```python
def detect_regime_change(self, team_name: str, game_date: date) -> bool:
    """
    Detect if a major event occurred that should reset momentum:
    - Head coach fired/hired
    - Star player traded
    - Star player returns from long injury
    
    If detected, reset momentum window to start from the event date.
    """
    # Check for coaching changes or major trades in last 7 days
    # This can be sourced from ESPN transactions endpoint or manually flagged
```

#### Streak Bonuses
```python
def get_streak_bonus(self, team_name: str, game_date: date) -> float:
    """Extra adjustment for extreme streaks."""
    streak = self._get_current_streak(team_name, game_date)
    
    if streak >= 8:
        return 20   # 8+ game win streak: hot team
    elif streak >= 5:
        return 10   # 5-7 game win streak
    elif streak <= -8:
        return -20  # 8+ game losing streak: cold team
    elif streak <= -5:
        return -10  # 5-7 game losing streak
    return 0
```

### Verification
- [ ] A team that went 8-2 in last 10 should have positive momentum (+15 to +30 Elo)
- [ ] A team that went 2-8 in last 10 should have negative momentum (-15 to -30 Elo)
- [ ] Verify momentum adjustment never exceeds ±40 Elo points
- [ ] Verify exponential decay: a loss 10 games ago matters less than a loss 2 games ago

---

## Step 2.4 — Adjusted Elo Integration

### Objective
Combine all three context adjustments with the base dynamic Elo to produce a single "Adjusted Elo" for each team on each game day.

### Formula
```python
def get_adjusted_rating(self, team_name: str, game_date: date) -> float:
    """
    Final adjusted team strength = Base Elo + Injury + Fatigue + Momentum
    """
    base_elo = self.elo_model.get_rating(team_name)
    
    injury_adj = self.injury_tracker.get_team_injury_adjustment(team_name)
    fatigue_adj = self.fatigue_model.get_rest_adjustment(team_name, game_date)
    momentum_adj = self.momentum_tracker.get_momentum_adjustment(team_name, game_date)
    
    adjusted = base_elo + injury_adj + fatigue_adj + momentum_adj
    
    logger.debug(
        f"{team_name}: base={base_elo:.0f} "
        f"injury={injury_adj:+.0f} fatigue={fatigue_adj:+.0f} "
        f"momentum={momentum_adj:+.0f} → adjusted={adjusted:.0f}"
    )
    
    return adjusted
```

### Example Game Day Log
```
Boston Celtics: base=1720 injury=+0 fatigue=+10 momentum=+25 → adjusted=1755
Washington Wizards: base=1350 injury=-80 fatigue=-35 momentum=-20 → adjusted=1215
→ Prediction: Celtics 89.2% (was 85.1% without context)
```

### Integration Point
Modify `sports_ensemble.py` → `_generate_daily_predictions()` to call `get_adjusted_rating()` instead of `self.nba_elo.get_rating()` directly.

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/data/injury_tracker.py` | NEW | Polls ESPN injuries, calculates player impact |
| `monolith/data/fatigue_model.py` | NEW | Rest days, travel distance, schedule density |
| `monolith/data/momentum_tracker.py` | NEW | Rolling 10-game form, streak detection |
| `monolith/strategies/prediction/elo_model.py` | MODIFY | Use adjusted ratings in predictions |
| `monolith/strategies/prediction/sports_ensemble.py` | MODIFY | Wire in all context feeds |
| Database migration | NEW | `nba_injuries` table |

## Dependencies
- Phase 1 must be complete (need `nba_game_results` table for fatigue/momentum)
- ESPN Injuries API (free)
- ESPN Schedule API (already integrated)
- No new paid APIs required (SportsData.io is optional upgrade for faster injury data)
