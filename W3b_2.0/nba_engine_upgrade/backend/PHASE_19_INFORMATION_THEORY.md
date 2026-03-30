# Phase 24: Information Theory & Entropy
### *Ed Thorp's Framework — Measuring the Exact Information Content of Every Signal*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Inspired by:** **Ed Thorp** — the MIT mathematician who proved blackjack could be beaten with card counting, then invented the first quantitative hedge fund (Princeton Newport Partners). Thorp treated every bet as an information theory problem: how many bits of information do I have, and does that justify a bet?
> **Priority:** 🟡 High | **Estimated Effort:** 3-4 days | **Impact:** Eliminates low-information bets + optimizes bankroll growth rate

---

## Overview

Ed Thorp didn't ask "which team will win?" He asked: **"How much do I know that the market doesn't?"** This is fundamentally an *information theory* question. Shannon entropy measures the information content of every signal. If a feature adds zero information beyond what the market already knows, betting on it is gambling — not edge.

Phase 24 upgrades our system from "does this feature improve predictions?" to **"does this feature contain information the market hasn't already priced in?"**

---

## Step 24.1 — Shannon Entropy Feature Scoring

### File: `NEW → monolith/analytics/information_theory/entropy.py`

```python
import numpy as np
from scipy.stats import entropy

class EntropyAnalyzer:
    """
    Measure the information content of each feature using Shannon entropy.
    
    Ed Thorp's insight: A card counter doesn't know WHICH card comes next,
    but they know the DISTRIBUTION has shifted. Similarly, our features
    shift the probability distribution of game outcomes.
    
    High entropy = high uncertainty = feature tells us little
    Low entropy = certain outcome = feature is highly informative
    
    But what matters is CONDITIONAL entropy:
    H(Outcome | Feature) < H(Outcome) → the feature REDUCES uncertainty
    The difference = Information Gain = the feature's value
    """
    
    def information_gain(self, feature: np.array, outcome: np.array) -> dict:
        """
        How many BITS of information does this feature provide about game outcomes?
        
        IG(outcome; feature) = H(outcome) - H(outcome | feature)
        """
        # Baseline entropy of outcomes (should be ~0.99 bits for 50/50 games)
        h_outcome = self._binary_entropy(outcome.mean())
        
        # Conditional entropy: after observing the feature, how uncertain are we?
        h_conditional = self._conditional_entropy(feature, outcome)
        
        ig = h_outcome - h_conditional
        
        return {
            "information_gain_bits": ig,
            "baseline_entropy": h_outcome,
            "conditional_entropy": h_conditional,
            "uncertainty_reduction_pct": (ig / h_outcome) * 100,
            "equivalent_card_count": self._to_card_counting_analogy(ig),
        }
    
    def _to_card_counting_analogy(self, ig_bits: float) -> str:
        """
        Thorp analogy: In blackjack, knowing the true count is +5
        gives ~2% edge. How does our feature compare?
        
        0.01 bits → Like knowing 1 card was removed (minimal edge)
        0.05 bits → Like a true count of +3 (solid edge)
        0.10 bits → Like a true count of +6 (strong edge, bet big)
        0.20 bits → Like seeing the dealer's hole card (massive edge)
        """
        if ig_bits > 0.15:
            return "MASSIVE_EDGE (dealer hole card)"
        elif ig_bits > 0.08:
            return "STRONG_EDGE (true count +5)"
        elif ig_bits > 0.03:
            return "MODERATE_EDGE (true count +3)"
        elif ig_bits > 0.01:
            return "MINIMAL_EDGE (true count +1)"
        else:
            return "NO_EDGE (random deck)"
    
    def rank_all_features(self, feature_matrix: pd.DataFrame, 
                           outcomes: pd.Series) -> pd.DataFrame:
        """
        Rank every feature by information gain.
        
        Features below a threshold should be REMOVED because they
        add model complexity without reducing uncertainty.
        
        Thorp's rule: "Never make a bet when you don't have the edge."
        Translation: Never use a feature that doesn't reduce entropy.
        """
        results = []
        for col in feature_matrix.columns:
            ig = self.information_gain(feature_matrix[col].values, outcomes.values)
            results.append({"feature": col, **ig})
        
        return pd.DataFrame(results).sort_values("information_gain_bits", ascending=False)
```

---

## Step 24.2 — Mutual Information Between Features (Redundancy Detection)

```python
class RedundancyDetector:
    """
    Two features might both be informative, but if they contain the
    SAME information, using both is redundant and causes overfitting.
    
    Example: "Elo difference" and "win probability" contain nearly
    identical information. Using both gives zero extra bits.
    
    Thorp never double-counted information. Neither should we.
    
    Method: I(feature_A; feature_B) — mutual information between features
    High MI → redundant → keep only the better one
    """
    
    def find_redundant_pairs(self, features: pd.DataFrame, 
                              threshold: float = 0.8) -> List[tuple]:
        """
        Find pairs of features with high mutual information (redundant).
        Return ranked list of pairs to consider removing one of.
        """
        from sklearn.feature_selection import mutual_info_classif
        
        redundant = []
        cols = features.columns.tolist()
        
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                mi = mutual_info_classif(
                    features[[cols[i]]].values, 
                    features[cols[j]].values, 
                    discrete_features=False
                )[0]
                
                # Normalize to [0, 1]
                mi_normalized = mi / max(
                    self._feature_entropy(features[cols[i]]),
                    self._feature_entropy(features[cols[j]]),
                    1e-6
                )
                
                if mi_normalized > threshold:
                    redundant.append({
                        "feature_a": cols[i],
                        "feature_b": cols[j],
                        "mutual_information": mi_normalized,
                        "recommendation": f"Remove {cols[j]} (keep {cols[i]})"
                    })
        
        return sorted(redundant, key=lambda x: -x["mutual_information"])
```

---

## Step 24.3 — Optimal Growth Rate Kelly (Thorp's Full Kelly)

```python
class ThropKellyOptimizer:
    """
    Phase 13 already uses Kelly criterion, but Ed Thorp's actual approach
    was more sophisticated: OPTIMAL GROWTH RATE THEORY.
    
    Standard Kelly: f* = (bp - q) / b
    
    Thorp's insight: Standard Kelly assumes independent bets.
    When you have CORRELATED bets (multiple NBA games on the same night),
    you need the multivariate Kelly:
    
    f* = Σ^(-1) * μ
    
    Where:
    - Σ = covariance matrix of bet returns (from Phase 19)
    - μ = vector of expected returns (edges)
    - f* = optimal fraction vector for all simultaneous bets
    
    This is the MATHEMATICALLY OPTIMAL bankroll growth strategy,
    proven by Thorp and later by Cover's Universal Portfolio theory.
    """
    
    def multivariate_kelly(self, edges: np.array, 
                            covariance_matrix: np.array) -> np.array:
        """
        Compute the simultaneous optimal bet fractions for all tonight's bets.
        """
        sigma_inv = np.linalg.inv(covariance_matrix)
        f_star = sigma_inv @ edges
        
        # Thorp's practical rule: use fractional Kelly (25-50%)
        # Full Kelly maximizes growth but has brutal drawdowns
        f_practical = f_star * 0.35  # 35% Kelly — Thorp's recommendation
        
        # Cap any single bet at 5% of bankroll
        f_capped = np.clip(f_practical, 0, 0.05)
        
        return {
            "optimal_fractions": f_capped,
            "expected_growth_rate": self._log_growth_rate(f_capped, edges, covariance_matrix),
            "full_kelly_fractions": f_star,  # For reference (don't actually use)
            "risk_of_ruin_at_fraction": self._risk_of_ruin(f_capped, edges),
        }
    
    def _log_growth_rate(self, f, mu, sigma):
        """
        The Kelly criterion maximizes E[log(wealth)] — the logarithmic growth rate.
        g(f) = μ'f - 0.5 * f'Σf
        """
        return float(mu @ f - 0.5 * f @ sigma @ f)
```

---

## Step 24.4 — Information Ratio Dashboard

```python
class InformationRatioDashboard:
    """
    Track the "information ratio" of the entire system over time.
    
    Information Ratio = excess_return / tracking_error
    
    In Thorp's terms: how efficiently are we converting our information
    advantage into actual profit?
    
    A high IR means we're extracting value efficiently.
    A declining IR means our information edge is eroding.
    """
```

---

## Verification
- [ ] Rank all 43+ features by information gain — top 10 should include known strong features (Elo, injuries, rest)
- [ ] Identify and remove redundant feature pairs
- [ ] Multivariate Kelly should produce lower drawdowns than independent Kelly on backtest
- [ ] Information ratio should be ≥ 0.5 (Thorp's target was 1.0+)

## Dependencies
- `scipy.stats` (entropy calculations)
- `sklearn.feature_selection` (mutual information)
- `numpy.linalg` (matrix inverse for multivariate Kelly)
