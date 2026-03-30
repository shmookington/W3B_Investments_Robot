# Phase 8: Signal Processing & Pattern Recognition
### *Fourier Analysis, Wavelet Transforms, Anomaly Detection, Information Theory*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** Simons was a codebreaker before founding RenTech. He used signal processing to find hidden patterns in noisy data — the same math that cracked Soviet communications.
> **Priority:** 🟡 High | **Estimated Effort:** 4-5 days | **Impact:** Pattern discovery + noise filtering

---

## Overview

Every team's performance over a season is a **time series signal** — a sequence of game results, point differentials, and shooting percentages. Just like audio signals have hidden frequencies (bass, treble, harmonics), team performance has hidden **cyclic patterns** that repeat at weekly, monthly, and seasonal timescales.

Signal processing extracts these patterns and separates the **real signal** (exploitable patterns) from the **noise** (random variance).

---

## Step 8.1 — Fourier Analysis (Cyclic Pattern Detection)

### What It Does
Decomposes a team's performance time series into its component frequencies. Reveals hidden cycles: some teams peak in January, decline in March, and surge in April.

### File: `NEW → monolith/models/signals/fourier_detector.py`

```python
import numpy as np
from scipy.fft import fft, fftfreq

class TeamFourierAnalyzer:
    """
    Applies Discrete Fourier Transform to team performance time series
    to detect cyclical patterns invisible to the naked eye.
    """
    
    def analyze_team(self, team: str, metric: str = "margin") -> dict:
        """
        Decompose a team's season performance into frequency components.
        
        Args:
            team: Team name
            metric: "margin" (point diff), "off_rating", "def_rating", etc.
        
        Returns: dominant frequencies and their amplitudes
        """
        # Get game-by-game metric (e.g., point differential)
        time_series = self.get_team_metric_series(team, metric)
        
        N = len(time_series)
        yf = fft(time_series - np.mean(time_series))  # Remove DC component
        xf = fftfreq(N, d=1)[:N // 2]  # Frequency bins
        
        amplitudes = 2.0 / N * np.abs(yf[:N // 2])
        
        # Find dominant cycles
        top_freqs = np.argsort(amplitudes)[::-1][:5]
        
        cycles = []
        for idx in top_freqs:
            if xf[idx] > 0 and amplitudes[idx] > np.std(time_series) * 0.3:
                period = 1.0 / xf[idx]  # Period in games
                cycles.append({
                    "period_games": round(period, 1),
                    "period_description": self._describe_period(period),
                    "amplitude": float(amplitudes[idx]),
                    "phase": float(np.angle(yf[idx])),
                })
        
        return {
            "team": team,
            "dominant_cycles": cycles,
            "current_phase_prediction": self._predict_current_phase(cycles, N),
        }
    
    def _describe_period(self, period: float) -> str:
        if 6 <= period <= 8:
            return "weekly_cycle"       # ~3.5 games/week
        elif 12 <= period <= 18:
            return "biweekly_cycle"
        elif 25 <= period <= 35:
            return "monthly_cycle"      # Teams go through monthly hot/cold streaks
        elif 40 <= period <= 50:
            return "all_star_cycle"     # Pre/post All-Star break pattern
        return f"{period:.0f}_game_cycle"
    
    def predict_phase_position(self, team: str, game_date: date) -> dict:
        """
        Based on detected cycles, predict if the team is currently
        in an upswing or downswing phase.
        
        Returns: {"phase": "upswing", "magnitude": +3.2, "confidence": 0.7}
        """
```

### Example Output
```
Boston Celtics — Fourier Analysis:
Dominant Cycles:
  1. 28-game cycle (monthly) — amplitude 4.2 points — team goes hot/cold monthly
  2. 7-game cycle (weekly) — amplitude 2.1 points — performance dips mid-week
  3. 41-game cycle (pre/post ASB) — amplitude 3.8 points — historically strong after break

Current Phase: UPSWING (based on 28-game cycle, 2.8 games from peak)
Predicted adjustment: +3.2 Elo
```

---

## Step 8.2 — Wavelet Transform (Multi-Scale Pattern Detection)

### What It Does
Unlike Fourier (which gives global frequencies), wavelets detect patterns at **specific time points** — "the Celtics had a 2-week cold stretch in mid-January 2025."

### File: `NEW → monolith/models/signals/wavelet_detector.py`

```python
import pywt

class WaveletPatternDetector:
    """
    Continuous Wavelet Transform for localized pattern detection.
    Answers: "Is this team in a LOCALLY anomalous stretch right now?"
    """
    
    def detect_anomalous_stretch(self, team: str, window: int = 10) -> dict:
        """
        Use Morlet wavelet to detect if the team's last N games
        are statistically unusual compared to their baseline.
        """
        series = self.get_team_margin_series(team)
        
        # CWT with Morlet wavelet
        scales = np.arange(1, 32)
        coefficients, frequencies = pywt.cwt(series, scales, 'morl')
        
        # Power spectrum at current position
        current_power = np.abs(coefficients[:, -1]) ** 2
        historical_power = np.mean(np.abs(coefficients) ** 2, axis=1)
        
        # Z-score of current power vs historical
        z_scores = (current_power - historical_power) / np.std(np.abs(coefficients) ** 2, axis=1)
        
        # High z-score at any scale = anomalous current performance
        max_z = float(np.max(z_scores))
        anomalous_scale = int(scales[np.argmax(z_scores)])
        
        return {
            "is_anomalous": max_z > 2.0,
            "z_score": max_z,
            "anomalous_timescale": f"{anomalous_scale}-game pattern",
            "direction": "positive" if series[-1] > np.mean(series) else "negative",
        }
```

---

## Step 8.3 — Information Theory (Mutual Information Feature Selection)

### What It Does
Measures how much **real information** each feature provides about the outcome. Features with high mutual information are strong predictors. Features with zero mutual information are noise.

### File: `NEW → monolith/models/signals/info_theory.py`

```python
from sklearn.feature_selection import mutual_info_classif

class InformationTheorySelector:
    """
    Uses Shannon entropy and mutual information to:
    1. Rank features by predictive power
    2. Detect redundant features
    3. Measure the total extractable information in our data
    """
    
    def rank_features(self, X: np.array, y: np.array, 
                       feature_names: List[str]) -> pd.DataFrame:
        """
        Calculate mutual information between each feature and the outcome.
        
        MI = 0 → feature is pure noise (remove it)
        MI > 0.05 → feature has some predictive value
        MI > 0.10 → feature is strongly predictive
        """
        mi_scores = mutual_info_classif(X, y, random_state=42)
        
        ranking = pd.DataFrame({
            "feature": feature_names,
            "mutual_information": mi_scores,
            "rank": np.argsort(mi_scores)[::-1],
        }).sort_values("mutual_information", ascending=False)
        
        return ranking
    
    def detect_redundant_pairs(self, X: np.array, 
                                feature_names: List[str]) -> List[tuple]:
        """
        Find pairs of features that carry the SAME information
        (high mutual information with each other).
        
        Redundant features waste model capacity and can cause overfitting.
        Keep the one with higher MI to outcome, discard the other.
        """
    
    def calculate_total_extractable_info(self, X: np.array, y: np.array) -> float:
        """
        Theoretical upper bound on prediction accuracy given our features.
        
        Uses conditional entropy: H(Y|X) tells us how much uncertainty
        remains in the outcome after seeing all features.
        
        If H(Y|X) ≈ 0 → features perfectly predict outcomes (impossible in sports)
        If H(Y|X) ≈ H(Y) → features are useless
        
        Reality: H(Y|X) ≈ 0.85 * H(Y) → we can explain ~15% of the outcome
        This means ~57% win rate is the theoretical ceiling for NBA.
        """
```

---

## Step 8.4 — Anomaly Detection (Unusual Pattern Flagging)

### File: `NEW → monolith/models/signals/anomaly_detector.py`

```python
from sklearn.ensemble import IsolationForest

class SportsAnomalyDetector:
    """
    Detect unusual patterns that precede predictable outcomes.
    
    Renaissance used anomaly detection to find moments where the
    market was severely mispriced. In sports: detect when a line
    is "off" compared to what our features suggest.
    """
    
    def detect_line_anomaly(self, game_features: dict, market_prob: float) -> dict:
        """
        Is the market line anomalous given what we know about this game?
        
        If our 43-feature model says 65% but the market says 52%,
        AND this discrepancy is in the top 5% of historical discrepancies,
        that's an anomaly worth investigating.
        """
        
    def detect_performance_anomaly(self, team: str) -> dict:
        """
        Is this team performing unusually relative to their features?
        
        Sometimes a team with great features (rest, health, strong Elo)
        suddenly starts losing close games. This can signal:
        - Locker room issues (not captured by stats)
        - Hidden injury (star playing through undisclosed issue)
        - Scheme changes by opponents (game film adaptation)
        """
```

---

## XGBoost Features from Phase 8

| # | Feature | Source | Description |
|---|---------|--------|-------------|
| 32 | `fourier_phase` | 8.1 | Current position in dominant cycle (+upswing/-downswing) |
| 33 | `fourier_amplitude` | 8.1 | Strength of dominant cycle |
| 34 | `wavelet_anomaly_z` | 8.2 | Z-score of current performance vs baseline |
| 35 | `line_anomaly_score` | 8.4 | How unusual is the market line given features |
| 36 | `performance_anomaly` | 8.4 | Is team over/under-performing features |

## Dependencies
- `scipy` (FFT, wavelets)
- `pywt` (PyWavelets for CWT)
- `scikit-learn` (mutual information, Isolation Forest)
