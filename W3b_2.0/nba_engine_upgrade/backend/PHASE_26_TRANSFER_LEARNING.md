# Phase 25: Transfer Learning & Cross-Domain Intelligence
### *D.E. Shaw's Framework — Patterns in One Domain Predict Another*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Inspired by:** **David Shaw** — founder of D.E. Shaw, who pioneered computational pattern recognition across markets. Shaw's key insight: patterns discovered in one domain (equities) often transfer to another (commodities, currencies). He hired physicists, not finance majors, because cross-domain thinking was his edge.
> **Priority:** 🟢 Medium | **Estimated Effort:** 4-5 days | **Impact:** Unique edge from cross-sport pattern transfer

---

## Overview

Every sports bettor builds models using **only basketball data.** D.E. Shaw's approach was different: find patterns wherever they exist, then test if they transfer. Does the momentum effect in NBA (teams on a hot streak) behave like the momentum effect in stocks? Does mean reversion after blowout wins mirror mean reversion after earnings beats? If the same mathematical pattern appears across domains, it's more likely to be real (not just noise).

---

## Step 25.1 — Cross-Sport Pattern Transfer

### File: `NEW → monolith/analytics/transfer/cross_sport.py`

```python
class CrossSportTransfer:
    """
    Test whether patterns in OTHER sports predict NBA outcomes.
    
    Hypothesis 1: Momentum decay rates
    - NFL teams on winning streaks show a specific decay pattern
    - If NBA teams show the same decay curve, the underlying mechanism
      (psychology, media expectations, opponent preparation) is likely universal
    - Use the NFL-calibrated decay rate to improve NBA momentum modeling
    
    Hypothesis 2: Home field advantage after travel
    - MLB has 162 games with extensive travel data
    - The relationship between travel distance and performance is well-studied
    - Transfer the calibrated travel-fatigue curve from MLB to NBA
    - MLB sample size: 162 games * 30 teams = 4,860 data points per season
    - NBA sample size: 82 * 30 = 2,460 — less than half
    - Borrowing from MLB doubles our effective sample for travel models
    
    Hypothesis 3: Referee/umpire effects
    - MLB umpire tendencies are extensively documented (strike zone bias)
    - The mechanism (authority figure's unconscious bias) is the same
    - Transfer the discovered bias magnitude from MLB to NBA refs
    """
    
    TRANSFERABLE_PATTERNS = {
        "momentum_decay": {
            "source_sport": "NFL",
            "target_effect": "hot/cold streak regression rate",
            "mechanism": "Psychological adaptation + opponent adjustment",
            "expected_transfer_quality": "HIGH (same human psychology)",
        },
        "travel_fatigue": {
            "source_sport": "MLB",
            "target_effect": "performance drop per mile traveled",
            "mechanism": "Physiological fatigue (sleep, circadian disruption)",
            "expected_transfer_quality": "MEDIUM (different physical demands)",
        },
        "official_bias": {
            "source_sport": "MLB",
            "target_effect": "referee home/visitor foul differential",
            "mechanism": "Authority figure crowd influence",
            "expected_transfer_quality": "HIGH (same psychological mechanism)",
        },
        "altitude_adaptation": {
            "source_sport": "Soccer (FIFA altitude data)",
            "target_effect": "Visitor performance at Denver/Utah",
            "mechanism": "O2 saturation → VO2max reduction",
            "expected_transfer_quality": "HIGH (same physiology)",
        },
    }
    
    def test_transfer(self, pattern: str) -> dict:
        """
        Test whether a pattern from another sport transfers to NBA.
        
        Method:
        1. Estimate the effect size in the source sport (larger N)
        2. Apply the same model to NBA data
        3. Compare: does the source-sport calibration improve NBA predictions?
        """
```

---

## Step 25.2 — Financial Market → Sports Betting Transfer

```python
class FinancialTransfer:
    """
    D.E. Shaw's deepest insight: financial markets and betting markets
    are both prediction markets with informed and uninformed participants.
    
    Directly transferable concepts:
    
    1. MEAN REVERSION TIME SCALE
       - Stocks: after extreme moves, mean reversion takes ~20 trading days
       - NBA: after extreme runs (8-2 or 2-8), mean reversion takes ~15 games
       - Transfer: use the stock-calibrated reversion curve to set NBA lookback windows
    
    2. VOLATILITY CLUSTERING (GARCH)
       - Financial time series show volatility clustering (high-vol begets high-vol)
       - NBA: teams that have high variance in performance (some blowouts, some close losses)
         tend to CONTINUE having high variance
       - Transfer: GARCH model on NBA point differential to predict spread volatility
    
    3. MARKET MICROSTRUCTURE
       - In equities: bid-ask spread widening = uncertainty = opportunity
       - In betting: odds divergence across books = uncertainty = opportunity
       - Transfer: same detection algorithm, different data feed
    
    4. ORDER FLOW IMBALANCE
       - In equities: net buying pressure predicts short-term price movement
       - In betting: net sharp action predicts line movement direction
       - Transfer: same signal extraction technique
    """
    
    def garch_volatility_model(self, team: str) -> dict:
        """
        Apply GARCH(1,1) to a team's point differential time series.
        
        High conditional variance = unpredictable team → wider confidence intervals
        Low conditional variance = consistent team → tighter confidence intervals
        
        This directly improves bet sizing:
        - High-variance teams: reduce bet size (even with edge, variance kills you)
        - Low-variance teams: increase bet size (edge is more reliable)
        """
        from arch import arch_model
        
        differentials = self._get_point_differentials(team, last_n=82)
        model = arch_model(differentials, vol='GARCH', p=1, q=1)
        result = model.fit(disp='off')
        
        current_volatility = float(result.conditional_volatility[-1])
        mean_volatility = float(result.conditional_volatility.mean())
        
        return {
            "team": team,
            "current_volatility": current_volatility,
            "mean_volatility": mean_volatility,
            "vol_regime": "HIGH" if current_volatility > mean_volatility * 1.3 else 
                          "LOW" if current_volatility < mean_volatility * 0.7 else "NORMAL",
            "kelly_adjustment": mean_volatility / current_volatility,  # Reduce sizing when vol is high
        }
```

---

## Step 25.3 — Domain Adaptation Neural Network

```python
class DomainAdaptationModel:
    """
    Train a neural network on all sports simultaneously, then fine-tune on NBA.
    
    Architecture:
    - Shared bottom layers learn universal patterns (fatigue, momentum, home advantage)
    - Sport-specific top layers learn NBA-specific nuances
    
    Training data:
    - NFL: ~270 games/season × 5 seasons = 1,350 games
    - MLB: ~2,430 games/season × 5 seasons = 12,150 games
    - NBA: ~1,230 games/season × 5 seasons = 6,150 games
    - NHL: ~1,312 games/season × 5 seasons = 6,560 games
    - Total: ~26,110 games with normalized features
    
    Even features unique to one sport can help others through
    the shared representations in the bottom layers.
    """
```

---

## Verification
- [ ] Test each transferable pattern: does source-sport calibration improve NBA predictions?
- [ ] GARCH volatility model should produce better-calibrated confidence intervals
- [ ] Domain adaptation model should outperform NBA-only model on small-sample situations (early season)

## Dependencies
- `arch` (GARCH volatility modeling)
- NFL/MLB/NHL historical data (free from various sports APIs)
