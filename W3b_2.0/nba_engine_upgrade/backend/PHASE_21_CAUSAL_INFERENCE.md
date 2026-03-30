# Phase 22: Causal Inference
### *Moving From "X Correlates With Wins" to "X CAUSES Wins"*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech's models survived regime changes because they understood which signals had causal mechanisms vs which were spurious correlations. Correlations break without warning. Causal relationships are robust. This phase identifies which of our 43+ features have genuine causal power vs which are noise that happens to look useful.
> **Priority:** 🟡 High | **Estimated Effort:** 3-4 days | **Impact:** Prevents catastrophic model failure when correlations break

---

## Overview

Our XGBoost model might discover that "teams wearing white jerseys win 52% of the time." That's a **spurious correlation** — jersey color doesn't cause wins. But if it shows up in training data, XGBoost will use it, and when the correlation randomly flips, our model breaks.

RenTech spent enormous effort separating **causal features** (rest days genuinely cause fatigue) from **correlated features** (jersey color happens to correlate this season). Causal features are robust across regimes. Correlated features are ticking time bombs.

---

## Step 22.1 — Natural Experiment Detection

### File: `NEW → monolith/analytics/causal/natural_experiments.py`

```python
class NaturalExperimentDetector:
    """
    Find "natural experiments" in NBA data where the effect of a variable
    can be isolated because other factors are controlled.
    
    Natural experiments in the NBA:
    
    1. LOAD MANAGEMENT (causal test for rest)
       When a star sits a random regular-season game for "rest" (not injury),
       this is essentially a randomized experiment. The team's talent
       doesn't change — only rest status changes.
       → Compare: team performance WITH star vs WITHOUT star (same team, same month)
       → Isolates the true causal impact of one player
    
    2. COVID BUBBLE (causal test for home court)
       In the 2020 Orlando bubble, there was NO home court advantage.
       → Comparing bubble games to normal games isolates the true HCA effect
       → Result: HCA was ~3.2 points per game, not the 2.5 Elo models estimate
    
    3. TRADE DEADLINE SHOCK (causal test for roster changes)
       When a mid-season trade happens, other factors (schedule, coaching,
       arena) stay the same — only the roster changes.
       → Comparing team performance 10 games before vs 10 games after trade
       → Isolates the true impact of the traded player
    
    4. REFEREE ASSIGNMENT (causal test for ref bias)
       Referees are assigned to games semi-randomly (excluding conflicts).
       → This is essentially a randomized controlled trial.
       → Any performance difference associated with specific refs is causal.
    """
    
    def analyze_load_management(self) -> dict:
        """
        Find all load management games and calculate the true causal impact.
        """
        load_mgmt_games = self.db.query("""
            SELECT g.*, i.player, i.status
            FROM nba_game_results g
            JOIN nba_injuries i ON g.date = i.date AND g.home_team = i.team
            WHERE i.status = 'OUT' AND i.reason LIKE '%rest%'
        """)
        
        results = {}
        for player in load_mgmt_games.player.unique():
            games_with = self._get_team_games_with_player(player)
            games_without = self._get_load_mgmt_games(player)
            
            with_win_pct = games_with.home_won.mean()
            without_win_pct = games_without.home_won.mean()
            
            # This difference is CAUSAL because the player's absence was not
            # due to injury or opponent strength — it was essentially random
            causal_impact = with_win_pct - without_win_pct
            
            results[player] = {
                "causal_win_impact": causal_impact,
                "sample_size": len(games_without),
                "significant": self._is_significant(games_with, games_without),
            }
        
        return results
```

---

## Step 22.2 — Instrumental Variable Analysis

### File: `NEW → monolith/analytics/causal/instrumental_variables.py`

```python
class InstrumentalVariableAnalyzer:
    """
    Use instrumental variables to isolate causal effects.
    
    Problem: Does travel distance CAUSE worse performance, or do
    bad teams just happen to travel more (because they're in remote cities)?
    
    Instrument: Schedule randomness. The NBA schedule is partially random.
    Teams don't choose when they travel — the league assigns it.
    So we can use "scheduled travel distance" as an instrument that
    affects performance ONLY through fatigue (the causal channel).
    
    2SLS Regression:
    Stage 1: Fatigue_Level = f(scheduled_travel_distance)
    Stage 2: Game_Result = f(Fatigue_Level_predicted)
    """
    
    def two_stage_least_squares(self, instrument: str, treatment: str, 
                                  outcome: str) -> dict:
        """
        Run 2SLS to isolate the causal effect of treatment on outcome
        using the instrument.
        """
        from linearmodels.iv import IV2SLS
        
        model = IV2SLS.from_formula(
            f"{outcome} ~ 1 + [treatment ~ {instrument}]",
            data=self.data
        )
        results = model.fit()
        
        return {
            "causal_effect": float(results.params[treatment]),
            "p_value": float(results.pvalues[treatment]),
            "f_stat_first_stage": float(results.first_stage.diagnostics["f.stat"]),
            "weak_instrument": results.first_stage.diagnostics["f.stat"] < 10,
        }
```

---

## Step 22.3 — Granger Causality for Time Series Features

```python
class GrangerCausalityTester:
    """
    Test whether one time series (e.g., HMM regime state) 
    Granger-causes another (e.g., betting line movement).
    
    If our HMM regime transition Granger-causes line movement,
    that means our model detects regime changes BEFORE the market does.
    This is direct evidence of genuine alpha.
    
    If line movement Granger-causes our signals, we're just following
    the market (no alpha).
    """
    
    def test_granger(self, cause_series: pd.Series, effect_series: pd.Series,
                      max_lag: int = 5) -> dict:
        from statsmodels.tsa.stattools import grangercausalitytests
        
        data = pd.DataFrame({"cause": cause_series, "effect": effect_series}).dropna()
        results = grangercausalitytests(data[["effect", "cause"]], maxlag=max_lag)
        
        best_lag = min(results, key=lambda k: results[k][0]["ssr_ftest"][1])
        
        return {
            "granger_causes": results[best_lag][0]["ssr_ftest"][1] < 0.05,
            "best_lag": best_lag,
            "p_value": results[best_lag][0]["ssr_ftest"][1],
            "interpretation": "our_model_leads_market" if results[best_lag][0]["ssr_ftest"][1] < 0.05
                              else "no_causal_relationship",
        }
```

---

## Step 22.4 — Feature Causality Audit

```python
class FeatureCausalityAudit:
    """
    Audit every feature in our XGBoost pipeline for causal plausibility.
    
    Categories:
    - CAUSAL: rest days → fatigue → worse performance (mechanism is clear)
    - LIKELY_CAUSAL: altitude → O2 levels → worse cardio (plausible mechanism)
    - CORRELATED: team's uniform color → win rate (no mechanism, spurious)
    - UNKNOWN: needs investigation
    
    Features flagged as CORRELATED should be removed or carefully monitored.
    Features flagged as CAUSAL are safe to rely on across regimes.
    """
    
    FEATURE_AUDIT = {
        # Phase 1 features
        "elo_diff": "CAUSAL",          # Better team wins more - direct cause
        "elo_home_adj": "CAUSAL",      # Home court acoustics, travel, crowd - mechanisms proven
        
        # Phase 2 features
        "rest_days_diff": "CAUSAL",    # Fatigue is a physical mechanism
        "injury_impact": "CAUSAL",     # Missing players directly reduces talent
        "momentum_10": "CORRELATED",   # Hot hand fallacy? Regressionto mean? Needs testing
        
        # Phase 2.5 features
        "hmm_regime": "LIKELY_CAUSAL",         # Team quality causes win patterns
        "regime_transition": "LIKELY_CAUSAL",   # Regime shifts have real causes (trades, injuries)
        "bayesian_uncertainty": "CAUSAL",       # Uncertainty is mathematically defined
        
        # Phase 3 features
        "player_bpm_sum": "CAUSAL",    # Better players cause more wins
        "pace_diff": "LIKELY_CAUSAL",  # Style matchup has mechanical effects
        
        # Phase 14 features
        "ref_foul_rate": "CAUSAL",     # Refs directly control foul calls
        "altitude_delta": "CAUSAL",    # Altitude physically affects O2 intake
        "timezone_changes": "LIKELY_CAUSAL",  # Circadian disruption is physiological
    }
    
    def run_full_audit(self) -> dict:
        """
        For each feature marked CORRELATED or UNKNOWN, run tests:
        1. Does the feature's predictive power persist across seasons?
        2. Is there a plausible causal mechanism?
        3. Does permuting this feature degrade predictions? (feature importance test)
        4. Does the feature Granger-cause the outcome? (time precedence test)
        """
```

---

## Why Causal Inference Prevents Catastrophe

```
Scenario WITHOUT causal audit:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
XGBoost discovers: "Teams that score 115+ in previous game win 56% next game"
Model uses this feature heavily.
Reality: This is CORRELATION, not causation. Good teams score 115+ AND win next game.
When team quality shifts (trade deadline), this correlation breaks → model crashes.

Scenario WITH causal audit:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Audit flags "previous_game_score" as CORRELATED (no causal mechanism).
Feature is removed or downweighted.
Instead, model relies on CAUSAL features: player talent, rest, injuries.
When regime shifts happen, causal features adapt → model survives.
```

### Verification
- [ ] Audit all 43+ features → categorize as CAUSAL / LIKELY_CAUSAL / CORRELATED / UNKNOWN
- [ ] Remove or flag all CORRELATED features
- [ ] Granger test: HMM regime should Granger-cause line movement (not vice versa)
- [ ] Load management analysis should produce per-player causal impact estimates
- [ ] Model with causal-only features should have comparable Brier score but lower variance across seasons

## Dependencies
- `statsmodels` (Granger causality tests)
- `linearmodels` (Instrumental Variable / 2SLS regression)
- `scipy.stats` (statistical tests)
