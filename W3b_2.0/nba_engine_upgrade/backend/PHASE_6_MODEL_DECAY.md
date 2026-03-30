# Phase 17: Model Decay Detection & Auto-Adaptation
### *Knowing When Your Edge Is Dying Before Your Bankroll Does*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech's biggest advantage wasn't finding signals — it was detecting the exact moment signals stopped working and automatically downweighting them. Most quant funds blow up on "signal decay." RenTech never did.
> **Priority:** 🔴 Critical | **Estimated Effort:** 3-4 days | **Impact:** Prevents catastrophic drawdowns from dead signals

---

## Overview

Every edge in betting markets has a lifespan. The market adapts. Sportsbooks get smarter. Other sharp bettors find the same patterns. A signal that was +5% edge in October might be +2% by January and 0% by March. The system must detect this decay **before** it costs money.

---

## Step 17.1 — Concept Drift Detector

### File: `NEW → monolith/models/monitoring/drift_detector.py`

```python
class ConceptDriftDetector:
    """
    Monitors whether the relationship between features and outcomes
    is changing over time (concept drift).
    
    Methods:
    1. ADWIN (Adaptive Windowing) — fast detection of distribution changes
    2. Page-Hinkley Test — sequential change detection
    3. Kolmogorov-Smirnov on rolling windows — statistical test for distribution shift
    """
    
    def __init__(self, window_size=50, significance=0.05):
        self.window_size = window_size
        self.significance = significance
        self.history = []
    
    def check_drift(self, recent_predictions: List[dict]) -> dict:
        """
        Compare model performance in the last N games vs the training period.
        
        Compares:
        - Brier score (calibration): is the model still well-calibrated?
        - Edge realization: are predicted edges translating to actual wins?
        - Feature importance stability: have key features shifted in importance?
        """
        recent_brier = self._calculate_brier(recent_predictions[-self.window_size:])
        baseline_brier = self.baseline_brier
        
        # Page-Hinkley test for mean shift
        drift_detected = self._page_hinkley(
            [p["brier_contribution"] for p in recent_predictions],
            threshold=0.15
        )
        
        # KS test on predicted vs actual win rates
        predicted_probs = [p["predicted_prob"] for p in recent_predictions[-self.window_size:]]
        actual_wins = [p["actual_win"] for p in recent_predictions[-self.window_size:]]
        ks_stat, ks_p = self._calibration_ks_test(predicted_probs, actual_wins)
        
        return {
            "drift_detected": drift_detected or ks_p < self.significance,
            "current_brier": recent_brier,
            "baseline_brier": baseline_brier,
            "degradation_pct": (recent_brier - baseline_brier) / baseline_brier * 100,
            "ks_p_value": ks_p,
            "recommendation": self._get_recommendation(drift_detected, recent_brier),
        }
    
    def _get_recommendation(self, drift: bool, brier: float) -> str:
        if drift and brier > self.baseline_brier * 1.2:
            return "HALT_SIGNALS"  # Model is badly miscalibrated
        elif drift:
            return "REDUCE_SIZING"  # Model is drifting, risk less
        elif brier > self.baseline_brier * 1.1:
            return "RETRAIN_SOON"  # Performance degrading
        return "CONTINUE"
```

---

## Step 17.2 — Feature Importance Tracker

### File: `NEW → monolith/models/monitoring/feature_tracker.py`

```python
class FeatureImportanceTracker:
    """
    Track how each feature's predictive power changes over time.
    
    If `regime_transition_flag` was the #3 most important feature in October
    but drops to #25 by January, something has changed. Either:
    - The market has learned to price regime transitions (our edge is gone)
    - The feature's calculation has a bug introduced by a code change
    - The NBA's dynamics have shifted (regime transitions matter less this season)
    
    All three require different responses.
    """
    
    def track(self, model, current_date: date):
        """Store current feature importances for time-series analysis."""
        importances = model.feature_importances_
        feature_names = model.feature_names_
        
        snapshot = {
            "date": current_date,
            "importances": dict(zip(feature_names, importances)),
        }
        self.history.append(snapshot)
    
    def detect_importance_shift(self, feature: str, lookback_days=30) -> dict:
        """
        Has this feature's importance changed significantly?
        Uses Mann-Kendall trend test.
        """
        recent = [h["importances"][feature] for h in self.history[-lookback_days:]]
        trend, p_value = self._mann_kendall(recent)
        
        return {
            "feature": feature,
            "trend": "increasing" if trend > 0 else "decreasing",
            "significant": p_value < 0.05,
            "current_rank": self._get_rank(feature),
            "baseline_rank": self._get_baseline_rank(feature),
        }
    
    def get_dead_features(self) -> List[str]:
        """Features that have become useless (importance near zero)."""
        return [
            f for f, imp in self.history[-1]["importances"].items()
            if imp < 0.001 and self._was_significant(f)
        ]
```

---

## Step 17.3 — Signal Decay Curve Estimation

```python
class SignalDecayEstimator:
    """
    Estimate the half-life of each signal type.
    
    RenTech tracked signal decay religiously. They knew that
    a momentum signal had a 6-month half-life while a mean-reversion
    signal had a 2-week half-life. We do the same.
    """
    
    def estimate_half_life(self, signal_type: str) -> dict:
        """
        Fit an exponential decay curve to a signal's edge over time.
        
        edge(t) = edge_0 * exp(-λt)
        half_life = ln(2) / λ
        """
        edges_by_month = self._get_monthly_edges(signal_type)
        
        # Fit exponential decay
        from scipy.optimize import curve_fit
        def decay(t, edge_0, lam):
            return edge_0 * np.exp(-lam * t)
        
        popt, pcov = curve_fit(decay, range(len(edges_by_month)), edges_by_month)
        edge_0, lam = popt
        half_life_months = np.log(2) / lam if lam > 0 else float('inf')
        
        return {
            "signal_type": signal_type,
            "initial_edge": edge_0,
            "half_life_months": half_life_months,
            "current_edge": decay(len(edges_by_month), edge_0, lam),
            "months_until_zero_edge": -np.log(0.01) / lam if lam > 0 else float('inf'),
        }
```

---

## Step 17.4 — Auto-Adaptation Engine

```python
class AutoAdaptationEngine:
    """
    When drift is detected, automatically respond.
    
    Responses (ordered by severity):
    1. MINOR: Increase retraining frequency (weekly → daily)
    2. MODERATE: Reduce Kelly fraction by 50%
    3. MAJOR: Retrain model immediately on most recent data only
    4. SEVERE: Halt all signals until manual review
    5. CRITICAL: Switch to fallback model (simple Elo-only)
    """
    
    def respond_to_drift(self, drift_report: dict):
        if drift_report["degradation_pct"] > 30:
            self._activate_fallback_model()
            self._alert_telegram("🚨 CRITICAL: Switched to fallback model")
        elif drift_report["degradation_pct"] > 20:
            self._halt_signals()
            self._alert_telegram("🛑 SEVERE: All signals halted")
        elif drift_report["degradation_pct"] > 10:
            self._retrain_now()
            self._set_kelly_multiplier(0.5)
            self._alert_telegram("⚠️ MAJOR: Emergency retrain + half Kelly")
        elif drift_report["degradation_pct"] > 5:
            self._set_kelly_multiplier(0.75)
            self._alert_telegram("⚡ MODERATE: Sizing reduced to 75%")
        else:
            self._increase_retrain_frequency()
```

---

## Dependencies
- `scipy` (statistical tests, curve fitting)
- `scikit-multiflow` (ADWIN drift detection, optional)
- Telegram bot (already integrated)
