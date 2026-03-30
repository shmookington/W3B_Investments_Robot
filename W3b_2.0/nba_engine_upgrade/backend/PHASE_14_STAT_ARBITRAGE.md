# Phase 10: Statistical Arbitrage (Cross-Market)
### *Finding Mispricings Between Bet Types and Correlated Games*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech's bread and butter was stat arb — finding pairs of correlated instruments that temporarily diverge. Same math, different instruments.
> **Priority:** 🟢 Medium | **Estimated Effort:** 3-4 days | **Impact:** Additional signal source + market inefficiency exploitation

---

## Overview

In finance, stat arb means "Stock A and Stock B move together. When they diverge, bet on convergence." In sports, the equivalent is: "The moneyline implies 60% win probability but the spread implies 55%. One of these is wrong."

Cross-market mispricings happen because different bet types attract different bettors. Sharp money tends to hit spreads first, while the public hammers moneylines. This creates temporary discrepancies.

---

## Step 10.1 — Moneyline vs Spread Discrepancy Detector

### File: `NEW → monolith/analytics/cross_market_arb.py`

```python
class CrossMarketDetector:
    """
    Detects discrepancies between different bet types (ML, spread, total)
    that imply the market is internally inconsistent.
    """
    
    def detect_ml_spread_discrepancy(self, game: GameOdds) -> dict:
        """
        Convert spread to implied ML probability and compare to actual ML.
        
        If spread says Team A -5.5 (implied ~67% win prob)
        But moneyline says Team A -180 (implied ~64% win prob)
        → 3% discrepancy. The truth is probably somewhere in between.
        
        Historically, the SPREAD is more accurate (sharp money hits spreads first).
        So bet the moneyline in the direction the spread implies.
        """
        spread_implied_prob = self._spread_to_win_prob(game.home_spread)
        ml_implied_prob = american_to_implied_prob(game.home_ml)
        
        discrepancy = spread_implied_prob - ml_implied_prob
        
        if abs(discrepancy) > 0.03:  # 3%+ discrepancy
            return {
                "type": "ml_spread_arb",
                "spread_implied": spread_implied_prob,
                "ml_implied": ml_implied_prob,
                "discrepancy": discrepancy,
                "recommended_side": "home_ml" if discrepancy > 0 else "away_ml",
                "edge": abs(discrepancy),
            }
        return None
    
    def _spread_to_win_prob(self, spread: float) -> float:
        """
        Convert point spread to win probability.
        Empirical formula: P(win) ≈ 0.50 + spread * 0.033
        (Each point on the spread ≈ 3.3% win probability)
        """
        return 0.50 + spread * 0.033
```

---

## Step 10.2 — Cross-Book Arbitrage Scanner

### File: `MODIFY → monolith/analytics/cross_market_arb.py`

```python
def detect_cross_book_arb(self, game_odds: Dict[str, BookOdds]) -> dict:
    """
    Find games where different sportsbooks disagree enough
    to create a guaranteed profit (pure arbitrage).
    
    Example:
    - DraftKings: Lakers +150 (implied 40%)
    - FanDuel: Celtics -140 (implied 58.3%)
    - Combined implied: 40% + 58.3% = 98.3% (under 100% = arb exists)
    
    These are rare (< 0.1% of games) but risk-free when found.
    """
    best_home_odds = max(
        odds.home_ml for book, odds in game_odds.items()
    )
    best_away_odds = max(
        odds.away_ml for book, odds in game_odds.items()
    )
    
    home_implied = american_to_implied_prob(best_home_odds)
    away_implied = american_to_implied_prob(best_away_odds)
    
    total_implied = home_implied + away_implied
    
    if total_implied < 1.0:  # Arbitrage exists!
        return {
            "type": "pure_arb",
            "profit_pct": (1.0 - total_implied) * 100,
            "home_book": best_home_book,
            "away_book": best_away_book,
            "home_odds": best_home_odds,
            "away_odds": best_away_odds,
        }
```

---

## Step 10.3 — Public Bias Exploitation (Fading the Public)

### File: `NEW → monolith/analytics/public_bias.py`

```python
class PublicBiasExploiter:
    """
    The public has systematic, exploitable biases:
    
    1. FAVORITE BIAS: Public overvalues favorites (especially big names)
    2. RECENCY BIAS: Public overweights last game's result
    3. PRIMETIME BIAS: Public bets more on nationally televised games
    4. HOME TEAM BIAS: Public overvalues home teams
    5. STAR POWER BIAS: Public overvalues teams with recognizable stars
    
    When 70%+ of public bets are on one side but the line doesn't move,
    sharp money is on the other side. This is THE classic RenTech signal:
    "Don't fight the smart money."
    """
    
    POPULAR_TEAMS = {
        # Teams that attract disproportionate public betting
        "Los Angeles Lakers": 1.15,     # 15% more public action than neutral
        "Golden State Warriors": 1.12,
        "Boston Celtics": 1.08,
        "New York Knicks": 1.10,
        "Dallas Mavericks": 1.06,       # Luka effect
        "Brooklyn Nets": 1.05,
    }
    
    def get_public_bias_adjustment(self, team: str, is_favorite: bool,
                                     is_home: bool, is_primetime: bool) -> float:
        """
        Estimate how much the public has inflated this team's line.
        
        When all biases align (popular team + favorite + home + primetime),
        the line is likely 1-2 points inflated → fade the public.
        """
        bias_score = 0
        
        # Popularity bias
        if team in self.POPULAR_TEAMS:
            bias_score += 3  # Popular teams are overbet
        
        # Favorite bias
        if is_favorite:
            bias_score += 2  # Public loves favorites
        
        # Home bias
        if is_home:
            bias_score += 1  # Public slightly overvalues home
        
        # Primetime bias
        if is_primetime:
            bias_score += 2  # National TV = more casual bettors
        
        # Convert to Elo adjustment (fade the public)
        # Positive bias = public is on this team = we should lean away
        return -bias_score * 2  # Each bias point ≈ -2 Elo (fade direction)
```

---

## Step 10.4 — Correlated Game Analysis

```python
class CorrelatedGameDetector:
    """
    Detect when the outcome of one game affects the odds of another.
    
    Example: If the Celtics play at 7 PM and the Sixers play at 9 PM,
    and both are competing for the 1-seed, a Celtics WIN at 7 PM makes
    the Sixers MORE motivated at 9 PM (they need to keep pace).
    
    The 9 PM line was set before the 7 PM result was known.
    If the Celtics blow out their opponent, the Sixers' live motivation
    increases, but their pre-game line doesn't update.
    """
    
    def detect_correlated_games(self, game_date: date) -> List[CorrelatedPair]:
        """
        Find pairs of games on the same night where one result
        impacts the other's motivation or playoff implications.
        """
```

---

## XGBoost Features from Phase 10

| Feature | Source | Description |
|---------|--------|-------------|
| `ml_spread_discrepancy` | 10.1 | Gap between ML and spread implied probability |
| `public_bias_score` | 10.3 | How much public bias is inflating this line |
| `is_primetime` | 10.3 | National TV game flag |
| `correlated_game_impact` | 10.4 | Impact from earlier game on same night |

## Dependencies
- The Odds API (multi-book, already integrated in Phase 5)
- No new paid APIs required
