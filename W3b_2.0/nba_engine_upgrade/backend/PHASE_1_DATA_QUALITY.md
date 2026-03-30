# Phase 12: Data Quality Pipeline (The Secret Weapon)
### *RenTech's Actual Edge: Cleaner Data Than Everyone Else*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** Robert Mercer (RenTech's co-CEO) once said they spent *more time cleaning data than building models*. Bad data is the silent killer of every quant system. This phase ensures our data is impeccable.
> **Priority:** 🔴 Critical | **Estimated Effort:** 2-3 days | **Impact:** Prevents catastrophic model failures

---

## Overview

A single corrupted data point can silently ruin everything. Imagine:
- A wrong box score updates a player's BPM incorrectly → injury model misvalues them for weeks
- A timezone error makes 7 PM ET games appear as 7 PM UTC → fatigue model runs calculations on wrong game dates
- ESPN API returns a team name as "LA Clippers" instead of "Los Angeles Clippers" → signal doesn't match to a game → edge is missed

RenTech had **dedicated teams** that did nothing but find and fix data errors. We automate this.

---

## Step 12.1 — Automated Data Validation Layer

### File: `NEW → monolith/data/validation.py`

```python
class DataValidator:
    """
    Every piece of data entering the system passes through validation
    BEFORE it touches the models. No exceptions.
    
    Rules:
    1. Never trust raw API data blindly
    2. Cross-reference every data point against at least 2 sources
    3. Flag anomalies for manual review rather than silently processing them
    4. Log every validation failure for post-mortem analysis
    """
    
    def validate_game_result(self, result: GameResult) -> ValidationResult:
        """Validate a game result before inserting into database."""
        errors = []
        warnings = []
        
        # Rule 1: Score sanity check
        if result.home_score < 70 or result.home_score > 180:
            errors.append(f"Home score {result.home_score} outside normal range [70-180]")
        if result.away_score < 70 or result.away_score > 180:
            errors.append(f"Away score {result.away_score} outside normal range [70-180]")
        
        # Rule 2: Team name validation
        if result.home_team not in VALID_NBA_TEAMS:
            errors.append(f"Unknown home team: {result.home_team}")
        if result.away_team not in VALID_NBA_TEAMS:
            errors.append(f"Unknown away team: {result.away_team}")
        
        # Rule 3: Date sanity check
        if result.game_date > date.today():
            errors.append(f"Game date {result.game_date} is in the future")
        if result.game_date < date(2023, 10, 1):
            warnings.append(f"Game date {result.game_date} is very old")
        
        # Rule 4: Duplicate check
        if self.db.game_exists(result.espn_event_id):
            errors.append(f"Duplicate game: {result.espn_event_id}")
        
        # Rule 5: Logical consistency
        if result.home_team == result.away_team:
            errors.append("Home and away team are the same")
        if result.home_score == result.away_score:
            errors.append("NBA games cannot end in a tie")
        
        # Rule 6: Cross-reference margin
        expected_margin = result.home_score - result.away_score
        if result.margin != expected_margin:
            errors.append(f"Margin {result.margin} doesn't match scores ({expected_margin})")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )
    
    def validate_odds(self, odds: OddsSnapshot) -> ValidationResult:
        """Validate odds data before inserting."""
        errors = []
        
        # MLB odds should be between -10000 and +10000
        if odds.home_ml and not (-10000 <= odds.home_ml <= 10000):
            errors.append(f"Home ML {odds.home_ml} outside valid range")
        
        # Spread should be between -30 and +30
        if odds.home_spread and not (-30 <= odds.home_spread <= 30):
            errors.append(f"Spread {odds.home_spread} outside valid range")
        
        # Implied probabilities should sum to ~105% (with vig)
        if odds.home_implied_prob and odds.away_implied_prob:
            total = odds.home_implied_prob + odds.away_implied_prob
            if not (0.98 <= total <= 1.12):
                errors.append(f"Implied probs sum to {total:.3f} (expected ~1.04)")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors)
    
    def validate_player_stats(self, stats: PlayerStats) -> ValidationResult:
        """Validate player statistics."""
        errors = []
        
        # BPM typically ranges from -10 to +15
        if not (-15 <= stats.bpm <= 20):
            errors.append(f"BPM {stats.bpm} outside expected range [-15, 20]")
        
        # Minutes per game: 0-48
        if not (0 <= stats.minutes_per_game <= 48):
            errors.append(f"MPG {stats.minutes_per_game} outside valid range")
        
        # PPG: 0-50
        if not (0 <= stats.ppg <= 55):
            errors.append(f"PPG {stats.ppg} outside expected range")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors)
```

---

## Step 12.2 — Cross-Source Reconciliation

### File: `NEW → monolith/data/reconciliation.py`

```python
class DataReconciler:
    """
    Cross-reference data from multiple sources to catch errors.
    
    If ESPN says the Lakers won 112-108 but BallDontLie says 112-106,
    someone is wrong. Flag and investigate before processing.
    """
    
    async def reconcile_game_result(self, espn_result, bdr_result) -> dict:
        """
        Compare game result from ESPN vs Basketball-Reference/BallDontLie.
        
        If scores match → proceed
        If scores differ → flag for review, use the more reliable source
        """
        issues = []
        
        if espn_result.home_score != bdr_result.home_score:
            issues.append({
                "field": "home_score",
                "espn": espn_result.home_score,
                "bdr": bdr_result.home_score,
                "resolution": "use_bdr",  # Basketball-Reference is more reliable for final scores
            })
        
        if espn_result.away_score != bdr_result.away_score:
            issues.append({
                "field": "away_score",
                "espn": espn_result.away_score,
                "bdr": bdr_result.away_score,
                "resolution": "use_bdr",
            })
        
        return {
            "reconciled": len(issues) == 0,
            "issues": issues,
            "confidence": "high" if len(issues) == 0 else "review_needed",
        }
    
    async def reconcile_injury_status(self, espn_injuries, official_report) -> dict:
        """
        Compare ESPN injury list vs official NBA injury report.
        ESPN sometimes lags the official report by 1-2 hours.
        """
```

---

## Step 12.3 — Team Name Normalization Registry

### File: `NEW → monolith/data/team_registry.py`

```python
class TeamNameRegistry:
    """
    THE source of truth for team name mapping.
    Every data source uses slightly different team names.
    This registry normalizes all of them to a canonical form.
    """
    
    CANONICAL_NAMES = {
        # Canonical → [all known aliases]
        "Boston Celtics": ["Boston Celtics", "BOS", "Celtics", "Boston"],
        "Los Angeles Lakers": ["Los Angeles Lakers", "LA Lakers", "LAL", "Lakers"],
        "Los Angeles Clippers": ["Los Angeles Clippers", "LA Clippers", "LAC", "Clippers"],
        "Golden State Warriors": ["Golden State Warriors", "GS Warriors", "GSW", "Warriors", "Golden State"],
        "New York Knicks": ["New York Knicks", "NY Knicks", "NYK", "Knicks"],
        "Philadelphia 76ers": ["Philadelphia 76ers", "Phila 76ers", "PHI", "76ers", "Sixers"],
        "Portland Trail Blazers": ["Portland Trail Blazers", "Portland Blazers", "POR", "Blazers", "Trail Blazers"],
        "Oklahoma City Thunder": ["Oklahoma City Thunder", "OKC Thunder", "OKC", "Thunder"],
        "San Antonio Spurs": ["San Antonio Spurs", "SA Spurs", "SAS", "Spurs"],
        # ... all 30 teams with every variant from every API
    }
    
    def __init__(self):
        # Build reverse lookup: any alias → canonical name
        self._alias_map = {}
        for canonical, aliases in self.CANONICAL_NAMES.items():
            for alias in aliases:
                self._alias_map[alias.lower()] = canonical
    
    def normalize(self, raw_name: str) -> str:
        """
        Convert any team name variant to the canonical form.
        Raises ValueError if the name is completely unrecognized.
        """
        normalized = self._alias_map.get(raw_name.lower().strip())
        if normalized is None:
            # Try fuzzy matching
            from difflib import get_close_matches
            close = get_close_matches(raw_name.lower(), self._alias_map.keys(), n=1, cutoff=0.7)
            if close:
                normalized = self._alias_map[close[0]]
                logger.warning(f"Fuzzy-matched '{raw_name}' → '{normalized}'")
            else:
                raise ValueError(f"Unrecognized team name: '{raw_name}'")
        return normalized
```

---

## Step 12.4 — Real-Time Data Health Dashboard

### File: `MODIFY → monolith/api/routes/alpha.py`

```python
@router.get("/data/health")
async def data_health():
    """
    Real-time health check of all data pipelines.
    Answers: "Is our data fresh, complete, and consistent?"
    """
    return {
        "game_results": {
            "last_ingested": last_result_timestamp,
            "total_this_season": total_results,
            "status": "healthy" if last_result_timestamp > now - 24h else "stale",
        },
        "injuries": {
            "last_checked": last_injury_check,
            "teams_with_injuries": n_teams_injured,
            "status": "healthy" if last_injury_check > now - 1h else "stale",
        },
        "odds": {
            "last_snapshot": last_odds_snapshot,
            "books_tracked": n_books,
            "status": "healthy" if last_odds_snapshot > now - 30min else "stale",
        },
        "player_stats": {
            "last_refresh": last_player_refresh,
            "players_tracked": n_players,
            "status": "healthy" if last_player_refresh > now - 7d else "stale",
        },
        "validation_failures_24h": recent_validation_failures,
        "reconciliation_issues_24h": recent_reconciliation_issues,
    }
```

---

## Step 12.5 — Automated Alerting for Data Issues

```python
class DataAlertSystem:
    """
    Telegram alerts when something is wrong with the data.
    Catch problems BEFORE they corrupt predictions.
    """
    
    ALERT_RULES = {
        "stale_results": {
            "condition": "No new game results in 24+ hours on a game day",
            "severity": "critical",
            "action": "Check ESPN API connectivity",
        },
        "stale_injuries": {
            "condition": "Injury data not refreshed in 2+ hours on a game day",
            "severity": "high",
            "action": "Check injury feed API",
        },
        "validation_spike": {
            "condition": "5+ validation failures in 1 hour",
            "severity": "critical",
            "action": "API format may have changed, check raw responses",
        },
        "team_name_mismatch": {
            "condition": "Unrecognized team name encountered",
            "severity": "high",
            "action": "Update team registry with new alias",
        },
        "odds_anomaly": {
            "condition": "Implied probabilities sum to < 95% or > 115%",
            "severity": "medium",
            "action": "Check sportsbook API for format changes",
        },
    }
```

---

## The Jim Simons Data Philosophy

> "We don't have the best models. We have the best data." — A RenTech engineer

| RenTech Practice | Our Implementation |
|-----------------|-------------------|
| Dedicated data cleaning teams | Automated validation layer (Step 12.1) |
| Cross-referencing multiple data vendors | Multi-source reconciliation (Step 12.2) |
| Standardized entity resolution | Team name registry (Step 12.3) |
| Real-time data monitoring | Health dashboard + Telegram alerts (12.4, 12.5) |
| Immediately halt trading on bad data | Auto-pause signals when validation fails |

## Dependencies
- `difflib` (fuzzy string matching, Python stdlib)
- Telegram bot (already integrated)
- No paid APIs required — this phase is about infrastructure, not data sources
