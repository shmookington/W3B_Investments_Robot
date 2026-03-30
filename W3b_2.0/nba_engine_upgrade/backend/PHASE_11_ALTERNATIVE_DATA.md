# Phase 14: Alternative Data Sources
### *Weather, Referees, Travel, Arena Effects — The Hidden Variables Nobody Else Uses*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech was famous for finding alpha in data sources nobody else thought to look at. While competitors analyzed price data, RenTech analyzed weather patterns, satellite imagery, and obscure government filings. We do the same for sports.
> **Priority:** 🟡 High | **Estimated Effort:** 4-5 days | **Impact:** Unique edge from data competitors don't have

---

## Overview

Every sportsbook and sharp bettor looks at the same data: Elo, injuries, rest days, line movement. To truly replicate the RenTech edge, we need to find **data sources nobody else is using** — or at least that very few bettors systematically incorporate.

---

## Step 14.1 — Referee Tendency Analysis

### File: `NEW → monolith/data/referee_tracker.py`

```python
class RefereeTracker:
    """
    NBA referees have measurable, persistent tendencies that affect game outcomes.
    
    Documented biases:
    - Some referees call 30% more fouls → favors teams that draw fouls (drives to basket)
    - Some referees let physical play go → favors defensive teams
    - Some referees have a measurable home-team bias in foul differential
    - Over/under tendencies: high-foul refs → more free throws → higher totals
    
    Data source: NBA official referee assignments (released ~9 AM day-of-game)
    Historical data: pbpstats.com or NBA Stats API
    """
    
    REF_METRICS = {
        "fouls_per_game": "Total fouls called per game (avg ~42, range 36-48)",
        "foul_differential": "Home team foul advantage (avg -1.2, some refs -3.0)",
        "pace_factor": "Games reffed by this crew tend to be faster/slower",
        "tech_rate": "Technical fouls per game (affects emotional/physical teams)",
        "review_tendencies": "How often this crew overturns calls via replay",
    }
    
    def get_ref_adjustment(self, ref_crew: List[str], home_team: str, 
                            away_team: str) -> dict:
        """
        Calculate Elo and total adjustments based on tonight's ref crew.
        
        Example: If ref crew averages 48 fouls/game and the home team
        ranks #3 in FTA/game while the away team ranks #25 → home team
        benefits (+5 Elo) because they'll get more trips to the line.
        """
        crew_avg_fouls = np.mean([self.ref_stats[r]["fouls_per_game"] for r in ref_crew])
        crew_home_bias = np.mean([self.ref_stats[r]["foul_differential"] for r in ref_crew])
        
        home_fta_rank = self.team_stats[home_team]["fta_rank"]  # 1-30
        away_fta_rank = self.team_stats[away_team]["fta_rank"]
        
        # High-foul ref + high-FTA team = advantage
        foul_advantage = 0
        if crew_avg_fouls > 44:  # Above-average foul callers
            if home_fta_rank <= 10:
                foul_advantage += 4
            if away_fta_rank <= 10:
                foul_advantage -= 4
        
        return {
            "spread_adj": foul_advantage + crew_home_bias,
            "total_adj": (crew_avg_fouls - 42) * 0.5,  # Each extra foul ≈ 0.5 extra points
            "ref_crew": ref_crew,
        }
```

---

## Step 14.2 — Travel & Logistics Intelligence

### File: `NEW → monolith/data/travel_tracker.py`

```python
class TravelIntelligence:
    """
    Beyond simple "rest days" (Phase 2), track actual travel logistics.
    
    Hidden factors:
    - Flight delays (weather-related, mechanical) → late arrivals → less shootaround time
    - Timezone changes → circadian rhythm disruption (West→East is worse than East→West)
    - Altitude changes → Denver's 5,280ft elevation measurably affects visitors
    - Road trip length → 4+ games on the road compounds fatigue differently than 2
    """
    
    ALTITUDE_MAP = {
        "Denver Nuggets": 5280,     # Mile High — measurable O2 disadvantage for visitors
        "Utah Jazz": 4226,          # Salt Lake is also elevated
        "Phoenix Suns": 1086,
        # ... all other teams at ~0-800 ft
    }
    
    TIMEZONE_MAP = {
        "Boston Celtics": "ET", "New York Knicks": "ET",
        "Los Angeles Lakers": "PT", "Golden State Warriors": "PT",
        "Denver Nuggets": "MT", "Chicago Bulls": "CT",
        # ... all 30 teams
    }
    
    def get_travel_factors(self, team: str, game_date: date) -> dict:
        """Calculate travel-related adjustments."""
        recent_games = self.get_last_n_games(team, 5)
        
        # Timezone crossings in last 48 hours
        tz_changes = self._count_timezone_changes(team, game_date, hours=48)
        
        # Altitude change from last game
        altitude_delta = abs(
            self.ALTITUDE_MAP.get(self._get_venue(team, game_date), 0) -
            self.ALTITUDE_MAP.get(self._get_last_venue(team, game_date), 0)
        )
        
        # Consecutive road games
        road_streak = self._get_road_streak(team, game_date)
        
        return {
            "tz_change_adj": tz_changes * -5,           # Each TZ change = -5 Elo
            "altitude_adj": -8 if altitude_delta > 3000 else 0,  # Denver/Utah visitors
            "road_streak_adj": min(0, -(road_streak - 3) * 4),   # -4 Elo per game beyond 3
            "direction": "westbound" if self._is_westbound(team, game_date) else "eastbound",
        }
```

---

## Step 14.3 — Weather & Arena Environmental Factors

### File: `NEW → monolith/data/environment_tracker.py`

```python
class EnvironmentTracker:
    """
    Weather affects outdoor sports directly, but even for basketball:
    - Severe weather → fan attendance drops → less home court advantage
    - City-wide events (concerts, holidays) → either energized or distracted crowds
    - Arena-specific factors (some arenas are notoriously loud/quiet)
    """
    
    ARENA_HCA = {
        # Measured home court advantage in Elo, beyond generic HCA
        "Denver Nuggets": +12,    # Altitude + loud arena
        "Utah Jazz": +10,         # Altitude + hostile crowd
        "Miami Heat": +8,         # Heat culture, fans stay late
        "Boston Celtics": +7,     # Historic arena, passionate fans
        "Golden State Warriors": +9,  # Chase Center energy
        "New York Knicks": -3,    # MSG is hostile but fans don't always help
        # Default: 0 (generic HCA already captured in base model)
    }
    
    def get_arena_adjustment(self, home_team: str, game_date: date) -> float:
        base = self.ARENA_HCA.get(home_team, 0)
        
        # Check if it's a weekend/holiday game (louder crowds)
        if game_date.weekday() >= 5:  # Saturday/Sunday
            base += 3
        
        # Playoff games have amplified HCA
        if self._is_playoff_game(game_date):
            base *= 1.5
        
        return base
```

---

## Step 14.4 — Schedule Pattern Analysis

### File: `NEW → monolith/data/schedule_analysis.py`

```python
class SchedulePatternAnalyzer:
    """
    The NBA schedule itself contains exploitable patterns.
    
    Key patterns:
    - Teams consistently underperform in the 5th game in 7 nights
    - Wednesday games after Monday national TV games show fatigue
    - The game before the All-Star break → stars rest
    - First game back after All-Star break → rust
    - Second night of a home-and-home (same opponent twice in a row)
    - "Trap game" detection: easy opponent between two tough ones
    """
    
    SCHEDULE_SPOTS = {
        "5_in_7": {"elo_adj": -12, "description": "5th game in 7 nights"},
        "4_in_5": {"elo_adj": -8,  "description": "4th game in 5 nights"},
        "post_national_tv": {"elo_adj": -4, "description": "After national TV game"},
        "pre_allstar": {"elo_adj": -8, "description": "Last game before All-Star break"},
        "post_allstar": {"elo_adj": -5, "description": "First game back from break"},
        "home_home_g2": {"elo_adj": +5, "description": "2nd game of home-and-home"},
    }
```

---

## XGBoost Features from Phase 14
| Feature | Source | Description |
|---------|--------|-------------|
| `ref_foul_rate` | 14.1 | Tonight's crew average fouls/game |
| `ref_home_bias` | 14.1 | Crew's historical home foul differential |
| `timezone_changes` | 14.2 | TZ changes in last 48 hrs |
| `altitude_delta` | 14.2 | Altitude change from last game |
| `road_streak_length` | 14.2 | Consecutive away games |
| `arena_hca_adj` | 14.3 | Team-specific home court boost |
| `schedule_spot_type` | 14.4 | Current schedule situation code |

## Dependencies
- NBA official referee assignments (released day-of-game)
- `pbpstats.com` or NBA Stats API (historical ref data)
- OpenWeather API (free tier)
- Arena coordinates (static dataset)
