# Phase 11: Bayesian Inference / MCMC
### *Full Probability Distributions, Not Point Estimates*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech never used single-number estimates. Every parameter had a distribution. Every prediction had a confidence interval. This is what separates quant from gambler.
> **Priority:** 🟡 High | **Estimated Effort:** 4-5 days | **Impact:** Uncertainty quantification + optimal bet sizing

---

## Overview

Most of our existing models produce a single number: "Celtics have a 64% chance to win." But how confident are we in that 64%? Is it 64% ± 2% (we're very sure) or 64% ± 12% (we have no idea)?

Bayesian inference answers this by maintaining **full probability distributions** over all parameters — not just the best guess but the entire range of plausible values.

This matters enormously for **bet sizing:** you should bet much larger when the model is confident (narrow distribution) and much smaller when it's uncertain (wide distribution).

---

## Step 11.1 — Bayesian Team Strength Model

### File: `MODIFY → monolith/models/markov/bayesian_elo.py`

See Phase 2.5 Enhanced (Implementation D) for the full MCMC Bayesian Elo implementation.

The key outputs that flow into this phase:
```python
# Instead of: Celtics = 1720 Elo
# We get: Celtics = Normal(μ=1720, σ=45)
# 95% CI: [1632, 1808]
# This 176-point range is the UNCERTAINTY

# When uncertainty is high → bet less (or skip)
# When uncertainty is low → bet more
```

---

## Step 11.2 — Bayesian Injury Impact

### File: `NEW → monolith/models/bayesian/injury_bayes.py`

```python
class BayesianInjuryModel:
    """
    Instead of "LeBron OUT = -150 Elo" (a guess),
    compute a full posterior distribution of LeBron's impact.
    
    Prior: LeBron's BPM suggests -150 Elo
    Evidence: In the 12 games he missed this season, the Lakers
              went 3-9 and were 8.2 points worse per game
    Posterior: LeBron OUT = Normal(μ=-135, σ=25)
    
    The posterior is more precise than the prior because it
    incorporates team-specific evidence of how they perform without him.
    """
    
    def fit_player_impact(self, player: str, team: str) -> dict:
        """
        Bayesian estimation of a player's on/off impact.
        
        Prior: BPM-based estimate (from Phase 3)
        Likelihood: Actual team performance with/without player
        Posterior: Updated impact estimate with uncertainty
        """
        import pymc as pm
        
        # Get games with and without this player
        games_with = self.get_games_player_played(player, team)
        games_without = self.get_games_player_missed(player, team)
        
        with pm.Model():
            # Prior: player impact from BPM
            bpm_prior = self.player_db.get_bpm(player)
            impact = pm.Normal("impact", mu=bpm_prior * 12, sigma=30)
            
            # Likelihood: team margin when player is OUT
            baseline_margin = pm.Normal("baseline", mu=0, sigma=10)
            
            margin_with = pm.Normal("with", mu=baseline_margin, sigma=12,
                                     observed=[g.margin for g in games_with])
            margin_without = pm.Normal("without", mu=baseline_margin + impact, sigma=12,
                                       observed=[g.margin for g in games_without])
            
            trace = pm.sample(2000, tune=1000, chains=4, return_inferencedata=True)
        
        impact_samples = trace.posterior["impact"].values.flatten()
        
        return {
            "player": player,
            "impact_mean": float(np.mean(impact_samples)),
            "impact_std": float(np.std(impact_samples)),
            "impact_ci95": (float(np.percentile(impact_samples, 2.5)),
                           float(np.percentile(impact_samples, 97.5))),
            "n_games_without": len(games_without),
            "confidence": "high" if len(games_without) >= 10 else "low",
        }
```

---

## Step 11.3 — Bayesian Kelly Criterion (Optimal Bet Sizing)

### File: `NEW → monolith/models/bayesian/bayesian_kelly.py`

```python
class BayesianKelly:
    """
    Standard Kelly criterion: f* = (bp - q) / b
    where b = decimal odds - 1, p = win probability, q = 1 - p
    
    Problem: Kelly assumes you KNOW p exactly. But our prediction
    has uncertainty. Bayesian Kelly integrates over the posterior
    distribution of p to get the optimal bet size.
    
    Result: Bayesian Kelly is always MORE CONSERVATIVE than standard Kelly
    when there's uncertainty. This is correct — you should bet less
    when you're less sure.
    """
    
    def bayesian_kelly_fraction(self, prob_samples: np.array, 
                                  decimal_odds: float) -> dict:
        """
        Calculate optimal bet fraction by integrating Kelly over
        the posterior distribution of win probability.
        
        Args:
            prob_samples: 2000+ MCMC samples of P(win)
            decimal_odds: The odds being offered
        
        Returns:
            Optimal fraction of bankroll to bet
        """
        b = decimal_odds - 1
        
        # Calculate Kelly for each posterior sample
        kelly_samples = []
        for p in prob_samples:
            q = 1 - p
            f = (b * p - q) / b
            kelly_samples.append(max(0, f))  # No negative bets
        
        return {
            "mean_kelly": float(np.mean(kelly_samples)),
            "median_kelly": float(np.median(kelly_samples)),
            "conservative_kelly": float(np.percentile(kelly_samples, 25)),
            "aggressive_kelly": float(np.percentile(kelly_samples, 75)),
            
            # Probability that Kelly says "don't bet" (f ≈ 0)
            "prob_no_bet": float(np.mean(np.array(kelly_samples) < 0.001)),
            
            # Recommended: use quarter-Kelly of the median
            "recommended_fraction": float(np.median(kelly_samples) * 0.25),
        }
```

### Why This Matters
```
Standard Kelly says: Bet 5% of bankroll (based on p = 0.62)
Bayesian Kelly says: Bet 2.8% of bankroll (because p could be 0.55-0.69)

The 2.2% reduction seems small, but across 500 bets per season:
- Standard Kelly: higher variance, risk of large drawdowns
- Bayesian Kelly: smoother equity curve, much lower risk of ruin
- After 1 season, bankroll difference is < 3%
- After 5 seasons, Bayesian Kelly is AHEAD because it avoided ruin scenarios
```

---

## Step 11.4 — Posterior Predictive Checks (Model Validation)

```python
class PosteriorPredictiveChecker:
    """
    The Bayesian way to check if your model is correct:
    
    1. Generate simulated game outcomes from the model's posterior
    2. Compare simulated statistics to actual statistics
    3. If they match → model captures reality
    4. If they diverge → model is missing something
    
    This is MUCH more rigorous than just checking accuracy %.
    """
    
    def run_ppc(self, model, actual_results: List[GameResult]) -> dict:
        """
        Posterior Predictive Check.
        
        Simulates 1000 "fake seasons" from the model and checks:
        - Does the simulated win distribution match reality?
        - Does the simulated margin distribution match reality?
        - Are upsets as frequent in simulation as in reality?
        """
        simulated_seasons = []
        for _ in range(1000):
            season = []
            for game in actual_results:
                prob = model.sample_prediction(game.home, game.away)
                sim_home_won = random.random() < prob
                season.append(sim_home_won)
            simulated_seasons.append(season)
        
        # Compare simulated vs actual statistics
        actual_home_win_pct = np.mean([g.home_won for g in actual_results])
        sim_home_win_pcts = [np.mean(s) for s in simulated_seasons]
        
        return {
            "home_win_pct_actual": actual_home_win_pct,
            "home_win_pct_simulated": np.mean(sim_home_win_pcts),
            "p_value": np.mean(np.array(sim_home_win_pcts) >= actual_home_win_pct),
            "model_calibrated": 0.05 < np.mean(np.array(sim_home_win_pcts) >= actual_home_win_pct) < 0.95,
        }
```

---

## XGBoost Features from Phase 11

| Feature | Source | Description |
|---------|--------|-------------|
| `home_strength_uncertainty` | 11.1 | Width of team strength posterior |
| `prediction_uncertainty` | 11.1 | Std of win probability posterior |
| `injury_impact_confidence` | 11.2 | How confident we are in injury adjustment |
| `bayesian_kelly_fraction` | 11.3 | Optimal bet size (uncertainty-adjusted) |

## Dependencies
- `pymc>=5.0.0` (Bayesian inference engine)
- `arviz` (posterior visualization and diagnostics)
- GPU recommended for MCMC sampling speed (not required)
