# Phase 3: Advanced Player-Level Statistics
### *From Team Ratings → Player-Driven Predictions*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🟡 High | **Estimated Effort:** 3-4 days | **Impact:** +10% on star-absence games
> **Depends on:** Phase 1 (Dynamic Elo), Phase 2 (Injury Tracker)

---

## Overview

Phase 2 gives us rough injury adjustments using BPM tiers. This phase makes those adjustments *precise* by building a full player statistics database. Instead of guessing "All-Stars are worth -80 Elo when OUT", we'll know exactly that "Nikola Jokic is worth -167 Elo to the Nuggets based on his 11.4 BPM and 34.2 minutes share."

---

## Step 3.1 — Player Statistics Database

### Data Sources

#### BallDontLie API (Free, No Key Required)
```
GET https://api.balldontlie.io/v1/players?search=LeBron
GET https://api.balldontlie.io/v1/season_averages?season=2025&player_ids[]=237
GET https://api.balldontlie.io/v1/stats?player_ids[]=237&seasons[]=2025
```

#### NBA Stats API (Free, No Key Required)
```
GET https://stats.nba.com/stats/leaguedashplayerstats?Season=2025-26&SeasonType=Regular+Season
Headers: {"Referer": "https://www.nba.com/", "User-Agent": "Mozilla/5.0"}
```
Returns: PER, BPM, VORP, Win Shares, Usage Rate, Net Rating, True Shooting %

### Database Schema
```sql
CREATE TABLE nba_player_stats (
    id              SERIAL PRIMARY KEY,
    player_name     VARCHAR(100) NOT NULL,
    team            VARCHAR(50) NOT NULL,
    season          VARCHAR(10) NOT NULL,
    -- Core impact metrics
    bpm             FLOAT DEFAULT 0.0,       -- Box Plus/Minus
    vorp            FLOAT DEFAULT 0.0,       -- Value Over Replacement
    per             FLOAT DEFAULT 0.0,       -- Player Efficiency Rating
    win_shares      FLOAT DEFAULT 0.0,       -- Total Win Shares
    -- Usage & minutes
    minutes_per_game FLOAT DEFAULT 0.0,
    minutes_share   FLOAT DEFAULT 0.0,       -- % of team minutes played
    usage_rate      FLOAT DEFAULT 0.0,       -- % of team possessions used
    -- Scoring
    ppg             FLOAT DEFAULT 0.0,
    true_shooting   FLOAT DEFAULT 0.0,
    -- Playmaking
    apg             FLOAT DEFAULT 0.0,
    turnover_rate   FLOAT DEFAULT 0.0,
    -- Rebounding
    rpg             FLOAT DEFAULT 0.0,
    -- Defense
    spg             FLOAT DEFAULT 0.0,
    bpg             FLOAT DEFAULT 0.0,
    defensive_rating FLOAT DEFAULT 0.0,
    -- Net rating
    net_rating      FLOAT DEFAULT 0.0,       -- Team net rating when player is on court
    on_off_diff     FLOAT DEFAULT 0.0,       -- Net rating ON court minus OFF court
    -- Meta
    games_played    INTEGER DEFAULT 0,
    is_starter      BOOLEAN DEFAULT false,
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_name, team, season)
);
CREATE INDEX idx_player_team ON nba_player_stats(team, season);
```

### Refresh Schedule
- Full refresh every **Monday at 5 AM ET** (NBA Stats API updates overnight)
- Track ~450 active NBA players (15 roster spots × 30 teams)
- Only store players with ≥10 games played (filter out 10-day contracts)

### File: `NEW → monolith/data/player_stats.py`

```python
class NBAPlayerStatsCollector:
    """
    Collects advanced player statistics from NBA Stats API
    and BallDontLie API. Updates weekly.
    """
    
    async def refresh_all_stats(self):
        """Full weekly refresh of all player stats."""
        
    def get_team_roster_impact(self, team_name: str) -> List[PlayerImpact]:
        """
        Returns ranked list of players on a team sorted by Elo impact.
        Used by Phase 2's InjuryTracker for precise injury adjustments.
        """
        
    def get_player_elo_value(self, player_name: str) -> float:
        """
        Convert player's BPM + minutes_share into an Elo point value.
        
        Formula: elo_value = BPM * minutes_share * 15
        
        Examples:
        - Jokic (BPM=11.4, min_share=0.70): 11.4 * 0.70 * 15 = 119.7 Elo
        - Role player (BPM=0.5, min_share=0.40): 0.5 * 0.40 * 15 = 3.0 Elo
        """
```

### Verification
- [ ] Database contains stats for all 30 teams' rosters (~450 players)
- [ ] Top 10 players by `elo_value` should match consensus top 10 (Jokic, Luka, Giannis, etc.)
- [ ] Verify `minutes_share` sums to roughly 1.0 per team

---

## Step 3.2 — Precise Injury Impact (Replaces Phase 2 Tiers)

### Objective
Replace the rough BPM tiers from Phase 2 with exact player-specific Elo values from the stats database.

### File: `MODIFY → monolith/data/injury_tracker.py`

```python
def get_precise_injury_adjustment(self, team_name: str) -> float:
    """
    Uses actual player stats instead of generic tiers.
    
    For each injured player:
    1. Look up their exact BPM and minutes_share from nba_player_stats
    2. Calculate their elo_value = BPM * minutes_share * 15
    3. Apply status multiplier (OUT=1.0, DOUBTFUL=0.75, etc.)
    4. Stack with diminishing returns
    """
    injured = self.get_team_injuries(team_name)
    adjustments = []
    
    for player in injured:
        stats = self.player_db.get_player_stats(player.name)
        elo_value = stats.bpm * stats.minutes_share * 15
        
        status_mult = STATUS_MULTIPLIER[player.status]
        adjustments.append(-elo_value * status_mult)
    
    return self._stack_with_diminishing_returns(adjustments)
```

### Example
```
Denver Nuggets injuries tonight:
- Nikola Jokic (OUT): BPM=11.4, min_share=0.70 → -119.7 Elo
- Jamal Murray (QUESTIONABLE): BPM=3.2, min_share=0.65 → -12.5 Elo (×0.40)
- Aaron Gordon (PROBABLE): BPM=2.1, min_share=0.60 → -1.9 Elo (×0.10)

Total (with diminishing): -119.7 + (-12.5 × 0.8) + (-1.9 × 0.6) = -131.0 Elo

Nuggets effective Elo: 1695 - 131 = 1564 (drops from #2 to roughly #15)
```

### Verification
- [ ] When Jokic is OUT, Nuggets effective Elo should drop ~120 points
- [ ] When an end-of-bench player is OUT, adjustment should be < 5 points
- [ ] Compare our injury adjustments to actual Vegas line moves when stars are ruled out

---

## Step 3.3 — Lineup-Based Prediction (30 Minutes Before Tip)

### Objective
When official starting lineups are announced (~30 min pre-game), recalculate the prediction using the actual 5 starters vs the full-strength starting 5.

### File: `NEW → monolith/models/lineup_model.py`

### Data Source
```
GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={event_id}
```
- Returns `rosters[].roster[].starter` field when lineups are announced
- Also check: `competitions[].competitors[].roster`

### Core Logic
```python
class NBALineupModel:
    def get_lineup_adjustment(self, team_name: str, actual_starters: List[str]) -> float:
        """
        Compare the actual starting lineup to the team's ideal starting lineup.
        
        If the actual lineup is missing a high-impact starter (benched/injured),
        calculate the net BPM difference and convert to Elo adjustment.
        """
        ideal_starters = self._get_ideal_starters(team_name)
        actual_bpm = sum(self.player_db.get_bpm(p) for p in actual_starters)
        ideal_bpm = sum(self.player_db.get_bpm(p) for p in ideal_starters)
        
        bpm_diff = actual_bpm - ideal_bpm  # Negative if weaker lineup
        
        # Convert BPM differential to Elo: 1 BPM ≈ 10 Elo points
        return bpm_diff * 10
```

### Timing
- First prediction: generated at the normal 15-minute cycle (using injury data)
- **Updated prediction**: generated 30 minutes before tip when lineups drop
- If lineup prediction differs significantly from initial prediction, send Telegram alert

### Verification
- [ ] When a star sits out and a G-League call-up starts, adjustment should be -80 to -120 Elo
- [ ] When a team starts its full-strength lineup, adjustment should be ~0
- [ ] Verify lineup data is available ≥25 minutes before tip for ≥90% of games

---

## Step 3.4 — Pace & Style Matchup Factor

### Objective
Certain team styles create favorable or unfavorable matchups independent of overall team strength.

### File: `NEW → monolith/models/style_matchup.py`

### Team Style Profiles
```python
class TeamStyleProfile:
    """
    Each team gets a style fingerprint based on:
    - pace: possessions per 48 min (fast 100+ vs slow 95-)
    - three_rate: % of shots from three (high 40%+ vs low 30%-)
    - paint_points: % of points in the paint (inside vs outside)
    - def_rating: defensive rating (elite 105- vs poor 115+)
    - turnover_rate: turnovers per possession
    """
```

### Style Clash Matrix
```python
STYLE_ADJUSTMENTS = {
    # Fast-paced team vs elite half-court defense → defense wins
    ("fast", "elite_defense"): -15,  # Fast team penalized
    
    # Three-heavy team vs poor perimeter defense → three-heavy wins
    ("three_heavy", "poor_perimeter_d"): +12,  # Three team boosted
    
    # Inside-dominant team vs elite rim protection → inside team penalized
    ("paint_heavy", "elite_rim_protection"): -10,
    
    # High turnover team vs aggressive defense → turnover team penalized
    ("turnover_prone", "aggressive_defense"): -8,
}
```

### Data Source
- NBA Stats API: Team `OffRtg`, `DefRtg`, `Pace`, `FG3A%`, `PaintPts%`
- Refresh weekly alongside player stats

### Verification
- [ ] Verify style profiles match basketball reality (fast teams like Pacers, slow teams like Cavaliers)
- [ ] Style adjustments should be small (±5 to ±15 Elo) — they're tiebreakers, not primary signals

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/data/player_stats.py` | NEW | Weekly player stats collection (BPM, VORP, etc.) |
| `monolith/data/injury_tracker.py` | MODIFY | Use precise player Elo values instead of tier estimates |
| `monolith/models/lineup_model.py` | NEW | Starting lineup analysis 30 min pre-game |
| `monolith/models/style_matchup.py` | NEW | Pace/style clash adjustments |
| Database migration | NEW | `nba_player_stats` table |

## Dependencies
- Phase 1 (Dynamic Elo) and Phase 2 (Injury Tracker) must be complete
- BallDontLie API (free) + NBA Stats API (free)
- No paid APIs required
