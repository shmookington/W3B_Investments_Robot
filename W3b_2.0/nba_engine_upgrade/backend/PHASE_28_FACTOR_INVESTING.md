# Phase 27: Factor Investing for Sports
### *Cliff Asness / AQR Framework — Persistent, Explainable Factors That Drive NBA Outcomes*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Inspired by:** **Cliff Asness** — founder of AQR Capital Management ($140B AUM). Asness pioneered "factor investing" — the idea that a small number of persistent, well-understood factors (value, momentum, quality) explain most returns across all asset classes. He proved these factors work in stocks, bonds, currencies, AND commodities. We prove they work in sports.
> **Priority:** 🟡 High | **Estimated Effort:** 3-4 days | **Impact:** Framework for understanding WHY edges exist + detecting when they're crowded

---

## Overview

Instead of throwing 43+ features at XGBoost and hoping it figures it out, Asness would say: *"Which underlying FACTORS drive game outcomes? Group your features by factor. Weight by factor, not by feature."*

The NBA has its own "factors" — persistent effects that explain WHY teams win, analogous to the finance factors:

| Finance Factor | NBA Equivalent | What It Captures |
|---|---|---|
| **Value** | Underrated teams | Teams the market is pricing too low (recent slump but strong fundamentals) |
| **Momentum** | Hot streaks | Teams on a winning run (psychology + confidence) |
| **Quality** | Consistency | Teams with low variance in performance (reliable, well-coached) |
| **Carry** | Rest advantage | "Free" edge from scheduling (like carry in currencies) |
| **Low Volatility** | Boring but winning | Teams that win ugly but reliably cover |
| **Size** | Market attention | Small-market teams get less attention = less efficient pricing |

---

## Step 27.1 — Factor Construction

### File: `NEW → monolith/models/factors/nba_factors.py`

```python
class NBAFactorModel:
    """
    Construct pure factors for NBA game prediction.
    
    Each factor is a standardized score (-2 to +2) that can be
    compared across teams and across time.
    """
    
    def calculate_factors(self, team: str, opponent: str, game_date: date) -> dict:
        
        # VALUE: Is the team underpriced relative to fundamentals?
        # High value = team is losing games but underlying metrics (Net Rating,
        # SRS) suggest they're better than their record
        value = self._calculate_value(team, game_date)
        
        # MOMENTUM: Is the team on a hot or cold streak?
        momentum = self._calculate_momentum(team, game_date)
        
        # QUALITY: How consistent is the team?
        quality = self._calculate_quality(team, game_date)
        
        # CARRY: Does the team have a rest/schedule advantage?
        carry = self._calculate_carry(team, opponent, game_date)
        
        # LOW VOLATILITY: Does the team win reliably (low margin variance)?
        low_vol = self._calculate_low_volatility(team, game_date)
        
        # SIZE: Is this a small-market team with less betting attention?
        size = self._calculate_size_factor(team)
        
        return {
            "value": value,
            "momentum": momentum,
            "quality": quality,
            "carry": carry,
            "low_volatility": low_vol,
            "size": size,
            "composite_factor_score": self._composite(
                value, momentum, quality, carry, low_vol, size
            ),
        }
    
    def _calculate_value(self, team: str, game_date: date) -> float:
        """
        Value = gap between fundamental quality and market pricing.
        
        Fundamental quality: Net Rating, SRS (Simple Rating System) 
        Market pricing: implied win% from recent betting lines
        
        High value = market underestimates this team
        Low value = market overestimates this team
        """
        net_rating = self._get_net_rating(team)
        srs = self._get_srs(team)
        fundamental_win_pct = self._srs_to_win_pct(srs)
        
        market_win_pct = self._avg_market_implied_win_pct(team, last_n=10)
        
        value = fundamental_win_pct - market_win_pct  # Positive = underpriced
        return self._standardize(value)
    
    def _calculate_quality(self, team: str, game_date: date) -> float:
        """
        Quality = consistency of performance.
        
        A quality team has:
        - Low standard deviation of point differential
        - High clutch performance (close games)
        - Good coaching adjustments (better 2nd half performance)
        - Low turnover rate (disciplined play)
        """
        margin_std = np.std(self._get_recent_margins(team, n=20))
        clutch_record = self._get_clutch_record(team)  # Games within 5 points
        second_half_adj = self._get_second_half_netrtg(team) - self._get_first_half_netrtg(team)
        
        quality_raw = (1 / margin_std) * 10 + clutch_record * 5 + second_half_adj * 2
        return self._standardize(quality_raw)
```

---

## Step 27.2 — Factor Crowding Detection

```python
class FactorCrowdingDetector:
    """
    Asness's most important insight: factors work UNTIL everyone knows about them.
    When a factor gets crowded, it stops working.
    
    In NBA betting terms:
    - If EVERYONE is betting the "hot team" (momentum factor), the line
      adjusts and the edge disappears
    - If market efficiency has priced in rest advantage perfectly,
      the carry factor is crowded
    
    Detection: A factor is crowded when:
    1. The line moves BEFORE we can bet it (sharps beat us)
    2. The factor's historical edge is declining (Phase 17 decay)
    3. Public bet % correlates highly with the factor (public knows it too)
    """
    
    def detect_crowding(self, factor: str) -> dict:
        # Has this factor's edge been declining?
        historical_edges = self._get_factor_edges_by_month(factor)
        trend = self._mann_kendall_trend(historical_edges)
        
        # Does the public already bet this way?
        public_alignment = self._public_bet_correlation(factor)
        
        # Are lines already adjusted for this factor?
        line_pre_adjustment = self._line_already_adjusted(factor)
        
        crowding_score = (
            (0.4 * (1 if trend == "declining" else 0)) +
            (0.3 * public_alignment) +
            (0.3 * line_pre_adjustment)
        )
        
        return {
            "factor": factor,
            "crowding_score": crowding_score,  # 0 = uncrowded, 1 = fully crowded
            "recommendation": "REDUCE_WEIGHT" if crowding_score > 0.6 else
                              "MONITOR" if crowding_score > 0.3 else "EXPLOIT",
            "edge_trend": trend,
        }
```

---

## Step 27.3 — Factor Timing (When to Overweight)

```python
class FactorTimer:
    """
    Asness discovered that factors have SEASONS:
    
    - VALUE works best in January-February (post-early-season overreactions)
    - MOMENTUM works best in November (early-season streaks are real)
    - QUALITY works best in April (playoff positioning = effort)
    - CARRY works best in March (fatigue compounds late-season)
    
    The system should dynamically overweight factors when they're in season.
    """
    
    FACTOR_SEASONS = {
        "value": {"peak_months": [1, 2], "reason": "Market overreacts to early-season records"},
        "momentum": {"peak_months": [10, 11], "reason": "Early momentum reflects real improvements"},
        "quality": {"peak_months": [3, 4], "reason": "Quality teams elevate for playoff push"},
        "carry": {"peak_months": [2, 3], "reason": "Fatigue compounds most in the grind"},
        "low_volatility": {"peak_months": [11, 12, 1, 2], "reason": "Consistent teams shine in long season"},
        "size": {"peak_months": [10, 11, 12], "reason": "Small markets get least attention early"},
    }
```

---

## Verification
- [ ] Each factor should have positive edge over 3+ seasons (not random)
- [ ] Composite factor score should have better Sharpe ratio than any individual factor
- [ ] Crowding detection should flag momentum factor when public bet % > 70%
- [ ] Factor timing should improve Brier score by ≥2% when seasonally overweighting

## Dependencies
- Basketball-Reference or NBA Stats API (Net Rating, SRS data)
- Historical betting data (public bet %, from Phase 5)
