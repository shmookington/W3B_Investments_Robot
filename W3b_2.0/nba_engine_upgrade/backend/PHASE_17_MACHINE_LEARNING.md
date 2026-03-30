# Phase 6: Machine Learning Layer
### *From Handcrafted Rules → Data-Driven Ensemble*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🟢 Medium | **Estimated Effort:** 5-7 days | **Impact:** +10-20% overall (compounds everything)
> **Depends on:** Phases 1-5 (need all features as model inputs)

---

## Overview

Phases 1-5 gave us ~25 individual features (Elo rating, injury adjustment, fatigue, momentum, H2H, situational spots, line movement, etc.). Each feature currently applies a handcrafted Elo adjustment. The ML layer replaces those hand-tuned weights with a gradient-boosted model that learns the optimal combination from historical data.

**Why ML beats handcrafted rules:**
- It discovers non-linear interactions: "fatigue + injury together is worse than the sum of each"
- It finds optimal weights: maybe momentum matters 3x more than we assumed
- It adapts: retrain monthly as the NBA meta evolves

---

## Step 6.1 — Feature Engineering Pipeline

### Objective
Build an automated pipeline that takes raw data from all previous phases and outputs a clean, normalized feature vector for every NBA game.

### File: `NEW → monolith/ml/feature_pipeline.py`

### Feature Catalog (25 features)

#### Team Strength (4 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 1 | `home_elo` | Phase 1 | 1200-1800 |
| 2 | `away_elo` | Phase 1 | 1200-1800 |
| 3 | `elo_diff` | Phase 1 | -500 to +500 |
| 4 | `elo_diff_30d` | Phase 1 | -200 to +200 (how much team improved in 30 days) |

#### Injury Impact (4 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 5 | `home_injury_adj` | Phase 2/3 | -300 to 0 |
| 6 | `away_injury_adj` | Phase 2/3 | -300 to 0 |
| 7 | `injury_diff` | Derived | -300 to +300 |
| 8 | `star_out_flag` | Phase 3 | 0 or 1 (any top-20 player OUT) |

#### Fatigue (5 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 9 | `home_rest_days` | Phase 2 | 0-7 |
| 10 | `away_rest_days` | Phase 2 | 0-7 |
| 11 | `rest_diff` | Derived | -7 to +7 |
| 12 | `home_b2b` | Phase 2 | 0 or 1 |
| 13 | `travel_miles_diff` | Phase 2 | -3000 to +3000 |

#### Form & Momentum (4 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 14 | `home_momentum` | Phase 2 | -40 to +40 |
| 15 | `away_momentum` | Phase 2 | -40 to +40 |
| 16 | `home_streak` | Phase 2 | -15 to +15 |
| 17 | `away_streak` | Phase 2 | -15 to +15 |

#### Matchup & Situation (4 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 18 | `h2h_adj` | Phase 4 | -25 to +25 |
| 19 | `situational_adj` | Phase 4 | -25 to +25 |
| 20 | `is_division_game` | Phase 4 | 0 or 1 |
| 21 | `is_playoff` | Schedule | 0 or 1 |

#### Market Data (4 features)
| # | Feature | Source | Range |
|---|---------|--------|-------|
| 22 | `opening_spread` | Phase 5 | -20 to +20 |
| 23 | `spread_movement` | Phase 5 | -5 to +5 |
| 24 | `sharp_signal` | Phase 5 | -1, 0, +1 |
| 25 | `market_implied_prob` | Phase 5 | 0.0 to 1.0 |

### Feature Vector Construction
```python
class NBAFeaturePipeline:
    """
    Builds feature vectors for model training and live prediction.
    """
    
    def build_feature_vector(self, home_team: str, away_team: str, 
                              game_date: date) -> np.array:
        """
        Combines all 25 features into a single normalized vector.
        Used for both training (historical) and prediction (live).
        """
        features = {
            # Team Strength
            "home_elo": self.elo.get_rating(home_team),
            "away_elo": self.elo.get_rating(away_team),
            "elo_diff": self.elo.get_rating(home_team) - self.elo.get_rating(away_team),
            "elo_diff_30d": self.elo.get_improvement(home_team, 30) - self.elo.get_improvement(away_team, 30),
            
            # Injuries
            "home_injury_adj": self.injuries.get_adjustment(home_team),
            "away_injury_adj": self.injuries.get_adjustment(away_team),
            "injury_diff": ...,
            "star_out_flag": ...,
            
            # ... remaining 17 features
        }
        
        # Normalize all features to z-scores using training set statistics
        return self._normalize(features)
    
    def _normalize(self, features: dict) -> np.array:
        """Z-score normalization using pre-computed mean/std from training data."""
        return np.array([
            (features[f] - self.feature_stats[f]["mean"]) / self.feature_stats[f]["std"]
            for f in self.FEATURE_ORDER
        ])
```

### Historical Feature Storage
```sql
CREATE TABLE nba_feature_snapshots (
    id              SERIAL PRIMARY KEY,
    espn_event_id   VARCHAR(50) NOT NULL,
    game_date       DATE NOT NULL,
    home_team       VARCHAR(50) NOT NULL,
    away_team       VARCHAR(50) NOT NULL,
    feature_vector  JSONB NOT NULL,             -- All 25 features as JSON
    -- Label (filled in after game completes)
    home_won        BOOLEAN,
    margin          INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### Verification
- [ ] Build feature vectors for last 100 games → verify no NaN or missing values
- [ ] Check feature distributions → all should be roughly normal after z-scoring
- [ ] Verify features are constructed using ONLY pre-game data (no lookahead bias)

---

## Step 6.2 — XGBoost / LightGBM Predictor

### Objective
Train a gradient-boosted model that takes the 25-feature vector and outputs a calibrated win probability.

### File: `NEW → monolith/ml/xgb_predictor.py`

### Why XGBoost?
- Handles non-linear feature interactions automatically
- Built-in feature importance ranking
- Fast training (<1 minute on 3 seasons of data)
- Robust to overfitting with proper regularization
- Industry standard for tabular prediction tasks

### Model Architecture
```python
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import TimeSeriesSplit

class NBAXGBPredictor:
    def __init__(self):
        self.model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=4,           # Shallow trees prevent overfitting
            learning_rate=0.05,
            min_child_weight=10,   # Prevents fitting noise
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,         # L1 regularization
            reg_lambda=1.0,        # L2 regularization
            objective='binary:logistic',
            eval_metric='logloss',
            random_state=42,
        )
        self.calibrator = None
    
    def train(self, X_train, y_train, X_val, y_val):
        """
        Train with early stopping to prevent overfitting.
        """
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            early_stopping_rounds=30,
            verbose=False
        )
        
        # Calibrate probabilities using isotonic regression
        self.calibrator = CalibratedClassifierCV(
            self.model, method='isotonic', cv='prefit'
        )
        self.calibrator.fit(X_val, y_val)
    
    def predict_proba(self, feature_vector: np.array) -> float:
        """
        Returns calibrated win probability for the home team.
        """
        if self.calibrator:
            return self.calibrator.predict_proba(feature_vector.reshape(1, -1))[0][1]
        return self.model.predict_proba(feature_vector.reshape(1, -1))[0][1]
```

### Time-Series Cross-Validation
```python
def cross_validate(X, y, dates):
    """
    CRITICAL: Must use time-series splits, NOT random splits.
    
    We can't train on March data and test on January data —
    that would be lookahead bias (using future info to predict past).
    
    Split by month:
    - Fold 1: Train Oct-Dec, Test Jan
    - Fold 2: Train Oct-Jan, Test Feb
    - Fold 3: Train Oct-Feb, Test Mar
    - ...
    """
    tscv = TimeSeriesSplit(n_splits=5)
    scores = []
    
    for train_idx, test_idx in tscv.split(X):
        model = NBAXGBPredictor()
        model.train(X[train_idx], y[train_idx], X[test_idx], y[test_idx])
        
        pred = model.predict_proba_batch(X[test_idx])
        brier = brier_score_loss(y[test_idx], pred)
        scores.append(brier)
    
    return np.mean(scores)
```

### Hyperparameter Tuning with Optuna
```python
import optuna

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 500),
        'max_depth': trial.suggest_int('max_depth', 3, 6),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.1),
        'min_child_weight': trial.suggest_int('min_child_weight', 5, 20),
        'subsample': trial.suggest_float('subsample', 0.6, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
        'reg_alpha': trial.suggest_float('reg_alpha', 0.0, 1.0),
        'reg_lambda': trial.suggest_float('reg_lambda', 0.5, 2.0),
    }
    
    model = xgb.XGBClassifier(**params)
    brier = time_series_cross_validate(model, X, y, dates)
    return brier  # Lower is better

study = optuna.create_study(direction='minimize')
study.optimize(objective, n_trials=100)
best_params = study.best_params
```

### Feature Importance Analysis
```python
def analyze_features(model):
    """
    After training, examine which features the model relies on most.
    This reveals whether our handcrafted features actually matter.
    """
    importance = model.get_feature_importance()
    # Expected top features: elo_diff, injury_diff, rest_diff, market_implied_prob
    # If a feature has 0 importance → consider removing it
```

### Verification
- [ ] Time-series CV Brier score ≤ 0.205 (must beat market average of ~0.22)
- [ ] Feature importance shows Elo diff, injury adjustment, and rest differential in top 5
- [ ] Calibration curve: when model says 70%, outcomes should be ~68-72% wins
- [ ] No single feature has > 50% importance (model shouldn't over-rely on one signal)

---

## Step 6.3 — Model Blending (Ensemble of Ensembles)

### Objective
Combine the Elo model, XGBoost model, and market consensus into a final blended probability.

### File: `NEW → monolith/ml/model_blender.py`

```python
class NBAModelBlender:
    """
    Blends multiple model outputs into a final prediction.
    
    Default weights (tuned via optimization):
    - Adjusted Elo: 30%
    - XGBoost: 45%
    - Market consensus: 25%
    """
    
    def __init__(self):
        self.weights = {
            "elo": 0.30,
            "xgb": 0.45,
            "market": 0.25,
        }
    
    def blend(self, elo_prob: float, xgb_prob: float, 
              market_prob: float) -> float:
        """
        Weighted average of all model probabilities.
        
        If any model is unavailable (e.g., no market data),
        redistribute its weight equally to the others.
        """
        blended = (
            self.weights["elo"] * elo_prob +
            self.weights["xgb"] * xgb_prob +
            self.weights["market"] * market_prob
        )
        return blended
    
    def get_disagreement_flag(self, elo_prob, xgb_prob, market_prob) -> str:
        """
        Flag when models strongly disagree — indicates uncertainty.
        
        If all 3 models are within 5% of each other → HIGH confidence
        If 2 agree but 1 disagrees by >10% → MEDIUM confidence  
        If all 3 disagree by >8% each → LOW confidence (skip this signal)
        """
        probs = [elo_prob, xgb_prob, market_prob]
        spread = max(probs) - min(probs)
        
        if spread < 0.05:
            return "high_agreement"
        elif spread < 0.12:
            return "moderate_agreement"
        else:
            return "high_disagreement"  # Consider skipping
```

### Weight Optimization
```python
def optimize_blend_weights(elo_preds, xgb_preds, market_preds, actuals):
    """
    Find optimal weights by minimizing Brier score on validation data.
    Uses scipy.optimize.minimize with constraint that weights sum to 1.
    """
    from scipy.optimize import minimize
    
    def objective(weights):
        blended = weights[0]*elo_preds + weights[1]*xgb_preds + weights[2]*market_preds
        return brier_score_loss(actuals, blended)
    
    constraints = {'type': 'eq', 'fun': lambda w: sum(w) - 1.0}
    bounds = [(0.05, 0.60)] * 3  # Each model gets at least 5%
    
    result = minimize(objective, [0.33, 0.34, 0.33], 
                      bounds=bounds, constraints=constraints)
    return result.x
```

### Verification
- [ ] Blended model Brier score ≤ each individual model's Brier score
- [ ] Weight optimization converges and produces sensible weights (no model gets 0%)
- [ ] Disagreement flag correctly identifies uncertain games

---

## Step 6.4 — Automated Retraining Loop

### Objective
Retrain the XGBoost model weekly to incorporate new data and adapt to NBA meta changes.

### File: `NEW → monolith/ml/retrain_scheduler.py`

```python
class ModelRetrainer:
    """
    Every Monday at 4 AM ET:
    1. Build feature matrix from all historical data
    2. Train new XGBoost model
    3. Compare new model vs current production model on validation set
    4. Auto-promote if new model is better
    5. Alert via Telegram if new model is worse
    """
    
    async def retrain(self):
        # Step 1: Load all historical feature snapshots
        X, y, dates = self.feature_pipeline.load_historical()
        
        # Step 2: Train new model
        new_model = NBAXGBPredictor()
        train_mask = dates < (dates.max() - timedelta(days=14))
        val_mask = ~train_mask
        
        new_model.train(X[train_mask], y[train_mask], X[val_mask], y[val_mask])
        
        # Step 3: Compare to production model
        new_brier = brier_score_loss(y[val_mask], new_model.predict_proba(X[val_mask]))
        prod_brier = brier_score_loss(y[val_mask], self.prod_model.predict_proba(X[val_mask]))
        
        improvement = (prod_brier - new_brier) / prod_brier * 100
        
        # Step 4: Auto-promote if ≥1% better
        if improvement >= 1.0:
            self.promote(new_model)
            await self.telegram.send(
                f"✅ New model promoted! Brier: {new_brier:.4f} "
                f"(+{improvement:.1f}% vs old {prod_brier:.4f})"
            )
        else:
            await self.telegram.send(
                f"ℹ️ New model not promoted. Brier: {new_brier:.4f} "
                f"(only {improvement:.1f}% improvement)"
            )
    
    def promote(self, model):
        """Save new model to disk and swap with production model."""
        import joblib
        joblib.dump(model, "/opt/monolith/models/nba_xgb_latest.pkl")
        self.prod_model = model
```

### Schedule
- Retrain: Every Monday 4:00 AM ET
- Hyperparameter re-tune: First Monday of each month (with Optuna)
- Full feature re-evaluation: Start of each NBA season

### Verification
- [ ] Retrain produces a model with similar or better Brier score
- [ ] Telegram notification fires on both promote and skip scenarios
- [ ] Model file is correctly saved and loaded on engine restart

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/ml/feature_pipeline.py` | NEW | 25-feature vector construction |
| `monolith/ml/xgb_predictor.py` | NEW | XGBoost model training & prediction |
| `monolith/ml/model_blender.py` | NEW | Multi-model probability blending |
| `monolith/ml/retrain_scheduler.py` | NEW | Automated weekly retraining |
| Database migration | NEW | `nba_feature_snapshots` table |

## Dependencies
- Python packages: `xgboost`, `scikit-learn`, `optuna`, `joblib`
- Add to `requirements.txt`: `xgboost>=2.0.0`, `optuna>=3.0.0`
- Phases 1-5 must be complete (features come from all previous phases)
- At least 1 full season of historical feature data for initial training
