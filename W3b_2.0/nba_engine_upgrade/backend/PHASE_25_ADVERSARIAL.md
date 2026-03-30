# Phase 20: Adversarial Robustness & Counter-Intelligence
### *Defending Against the Books, Other Sharps, and Your Own Biases*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech operated under the assumption that the market was actively trying to take their money. They built adversarial defenses, detected when their signals were being front-run, and engineered robustness into every model. We operate under the same assumption about sportsbooks.
> **Priority:** 🟢 Medium | **Estimated Effort:** 3-4 days | **Impact:** Prevents being exploited by books + detects trap lines

---

## Overview

Sportsbooks are not passive participants. They employ quantitative teams of their own. They watch for patterns in your betting. They set "trap lines" designed to exploit known model biases. They share information about sharp bettors across books. If you win consistently without adversarial defenses, you'll be limited, exploited, or banned.

---

## Step 20.1 — Trap Line Detector

### File: `NEW → monolith/analytics/trap_detector.py`

```python
class TrapLineDetector:
    """
    Detect when a sportsbook has set a line designed to exploit model biases.
    
    Common traps:
    1. "Too good to be true" line: The line looks off by 2+ points, but
       it's intentional because the book has private injury info you don't have yet.
    
    2. "Reverse trap": Large line movement toward the public side, making
       it LOOK like a sharp opportunity on the other side, but it's coordinated.
    
    3. "Key number manipulation": Moving the line to just below/above a key
       number (3, 7, 10) to influence bet distribution without changing true value.
    
    Detection: If our model says 5%+ edge but NO other sharp indicators
    confirm it (no RLM, no steam, no sharp beat-writer alignment), the
    edge might be a trap.
    """
    
    def assess_trap_risk(self, signal: Signal) -> dict:
        """Score how likely this signal is a trap vs genuine edge."""
        
        trap_indicators = 0
        genuine_indicators = 0
        
        # Trap indicator: edge is unusually large for this game type
        if signal.edge > self._get_historical_edge_p95(signal.game_type):
            trap_indicators += 2
        
        # Trap indicator: only one book has this line (others are tighter)
        if self._is_outlier_line(signal):
            trap_indicators += 3
        
        # Trap indicator: no confirming sharp action
        if not signal.sharp_action_detected and not signal.reverse_line_movement:
            trap_indicators += 1
        
        # Genuine indicator: multiple books offer similar edge
        if self._multi_book_confirms(signal):
            genuine_indicators += 3
        
        # Genuine indicator: our model's edge aligns with Phase 2.5 HMM
        if signal.hmm_agrees:
            genuine_indicators += 2
        
        # Genuine indicator: line has moved in our direction (we're early)
        if self._line_moving_our_way(signal):
            genuine_indicators += 2
        
        trap_risk = trap_indicators / (trap_indicators + genuine_indicators + 1)
        
        return {
            "trap_risk": trap_risk,
            "trap_classification": "likely_trap" if trap_risk > 0.6 else 
                                    "possible_trap" if trap_risk > 0.3 else "genuine",
            "recommendation": "SKIP" if trap_risk > 0.6 else 
                              "REDUCE_SIZE" if trap_risk > 0.3 else "PROCEED",
        }
```

---

## Step 20.2 — Model Adversarial Testing

### File: `NEW → monolith/analytics/adversarial_testing.py`

```python
class AdversarialTester:
    """
    Test our model against adversarial attacks.
    
    If a sportsbook's quant team knows our model type (XGBoost + Elo + HMM),
    how would they exploit it? We simulate this to find weaknesses.
    
    Attack types:
    1. Feature poisoning: corrupting public data our model depends on
    2. Adversarial examples: games specifically designed to fool our model
    3. Overfitting exploitation: if we overfit to historical patterns,
       a regime change will destroy us
    """
    
    def generate_adversarial_games(self, model, n_games=1000) -> List[dict]:
        """
        Generate synthetic games that maximize our model's prediction error.
        
        Uses gradient-based adversarial example generation:
        Find feature vectors where small perturbations cause large prediction changes.
        These are the model's "blind spots."
        """
        vulnerable_regions = []
        
        for _ in range(n_games):
            # Random feature vector
            x = self._random_feature_vector()
            base_pred = model.predict_proba(x)[0][1]
            
            # Perturb each feature slightly
            for i, feature in enumerate(model.feature_names_):
                x_perturbed = x.copy()
                x_perturbed[0][i] += 0.1 * self._feature_std(feature)
                new_pred = model.predict_proba(x_perturbed)[0][1]
                
                sensitivity = abs(new_pred - base_pred) / 0.1
                
                if sensitivity > 0.5:  # Very sensitive to this perturbation
                    vulnerable_regions.append({
                        "feature": feature,
                        "sensitivity": sensitivity,
                        "base_prediction": base_pred,
                        "feature_value": x[0][i],
                    })
        
        return vulnerable_regions
    
    def find_model_blind_spots(self, model) -> dict:
        """
        Where does the model confidently predict wrong?
        These are the most dangerous cases.
        """
        test_games = self._get_test_set()
        blind_spots = []
        
        for game in test_games:
            pred = model.predict_proba(game.features)[0][1]
            confident_wrong = (pred > 0.65 and not game.home_won) or \
                             (pred < 0.35 and game.home_won)
            
            if confident_wrong:
                blind_spots.append({
                    "game": game,
                    "prediction": pred,
                    "actual": game.home_won,
                    "features": game.features,
                })
        
        # Cluster the blind spots to find patterns
        return self._cluster_blind_spots(blind_spots)
```

---

## Step 20.3 — Overfitting Immunization

```python
class OverfitImmunizer:
    """
    RenTech's biggest fear was overfitting — finding patterns in the
    training data that don't exist in reality. Their solution:
    
    1. Walk-forward validation (never peek at future data)
    2. Extreme p-value requirements (p < 0.001, not p < 0.05)
    3. Multiple hypothesis testing correction (Bonferroni)
    4. Economic significance test (even if statistically significant,
       is the edge large enough to overcome transaction costs?)
    5. Out-of-sample verification on completely held-out seasons
    """
    
    def comprehensive_overfit_test(self, model, data) -> dict:
        """
        Run all overfitting checks.
        Model must pass ALL of them to be deployed.
        """
        results = {}
        
        # 1. Walk-forward CV (no peeking)
        results["walk_forward"] = self._walk_forward_cv(model, data, n_splits=12)
        
        # 2. Permutation test (is the model better than random?)
        results["permutation"] = self._permutation_test(model, data, n_permutations=1000)
        
        # 3. Economic significance (can it profit after vig?)
        results["economic"] = self._economic_significance(model, data, vig=-110)
        
        # 4. Feature randomization (does performance drop when features are shuffled?)
        results["feature_randomization"] = self._feature_randomization_test(model, data)
        
        # 5. Regime robustness (does it work in different time periods?)
        results["regime_robustness"] = self._cross_regime_test(model, data)
        
        all_passed = all(r["passed"] for r in results.values())
        
        return {
            "all_passed": all_passed,
            "results": results,
            "recommendation": "DEPLOY" if all_passed else "ITERATE",
        }
```

---

## Step 20.4 — Self-Bias Detector

```python
class SelfBiasDetector:
    """
    The most dangerous adversary is yourself.
    
    Common quant biases:
    1. Confirmation bias: only remembering the model's wins
    2. Recency bias: overweighting the last 10 games
    3. Outcome bias: judging a bet by result instead of process
    4. Look-ahead bias: accidentally using future info in training
    5. Survivorship bias: only analyzing games where we had signals (ignoring skipped games)
    """
    
    def audit_for_look_ahead(self, feature_pipeline, game_date: date):
        """
        Verify that NO features use data that wouldn't have been
        available BEFORE the game started.
        
        Checks:
        - All game results referenced are from BEFORE game_date
        - Injury data used is from the most recent pre-game report
        - Line movement data stops at game_time, not after
        """
    
    def audit_bet_journal(self, bet_history: List[PlacedBet]) -> dict:
        """
        Analyze betting history for human-induced biases.
        
        Flags:
        - Overriding model signals manually (how often, and does it help?)
        - Increasing bet size after losses (gambler's fallacy)
        - Avoiding signals on certain teams (emotional bias)
        """
```

---

## Dependencies
- `scikit-learn` (permutation tests, cross-validation)
- No new paid APIs
- Existing model infrastructure from Phase 6
