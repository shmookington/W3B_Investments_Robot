# Phase 21: Ensemble Meta-Learning (Stacking)
### *The Model That Learns Which Models to Trust — And When*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech didn't just average their models. They used a meta-model that dynamically weighted sub-models based on context. Their stacking approach learned that momentum models work best in January but regime models dominate in April. Static blending leaves money on the table.
> **Priority:** 🟡 High | **Estimated Effort:** 4-5 days | **Impact:** 5-8% improvement over static model blending

---

## Overview

Phase 6 blends our models with **static weights** (Elo 25%, XGBoost 35%, HMM 20%, Market 20%). This is good but naive. In reality:

- **Early season:** Elo is unreliable (small sample), but market odds are sharp → weight market higher
- **Late season:** Elo has converged, HMM regime states are well-calibrated → weight Elo/HMM higher
- **Playoff stretch:** Motivation (Phase 2.5.7 absorbing chains) matters more → weight situation models higher
- **Injury-heavy nights:** Player impact model matters most → weight Phase 3 higher
- **Live betting:** Markov chain dominates, everything else is noise → weight 2.5.3/2.5.8 almost exclusively

A **meta-learner** (stacking) learns these context-dependent weights automatically.

---

## Step 21.1 — Level-1 Model Outputs (Base Learners)

### File: `NEW → monolith/ml/stacking/base_outputs.py`

```python
class BaseModelOutputCollector:
    """
    Collects predictions from ALL sub-models as Level-1 features.
    
    Each base model produces a probability. The meta-learner's job
    is to learn the optimal combination given the context.
    """
    
    BASE_MODELS = {
        "elo_prob": "Phase 1 Dynamic Elo",
        "hmm_prob": "Phase 2.5.1 HMM standalone",
        "bayesian_prob": "Phase 2.5.4 Bayesian MCMC Elo",
        "higher_order_prob": "Phase 2.5.5 Higher-order chain",
        "xgb_prob": "Phase 6 XGBoost",
        "market_prob": "Phase 5 Market implied probability",
        "live_chain_prob": "Phase 2.5.3/2.5.8 Live chain (if in-game)",
    }
    
    def collect_base_predictions(self, game_context: dict) -> dict:
        """
        Run every base model on this game and collect their predictions.
        Also collect context features that tell the meta-learner
        WHEN to trust each model.
        """
        outputs = {}
        
        # Base model predictions
        outputs["elo_prob"] = self.elo_model.predict(game_context)
        outputs["hmm_prob"] = self.hmm_model.predict(game_context)
        outputs["bayesian_prob"] = self.bayesian_elo.predict_with_uncertainty(
            game_context["home_team"], game_context["away_team"])["mean_prob"]
        outputs["higher_order_prob"] = self.higher_order.get_win_probability(
            game_context["home_recent_results"])
        outputs["xgb_prob"] = self.xgb_model.predict_proba(game_context["features"])
        outputs["market_prob"] = game_context.get("market_implied_prob", 0.5)
        
        # Context features (teach meta-learner WHEN to trust each model)
        outputs["games_into_season"] = game_context["home_games_played"]
        outputs["is_playoff"] = game_context.get("is_playoff", 0)
        outputs["n_injuries_home"] = game_context.get("n_injuries_home", 0)
        outputs["n_injuries_away"] = game_context.get("n_injuries_away", 0)
        outputs["model_agreement"] = self._calculate_agreement(outputs)
        outputs["bayesian_uncertainty"] = self.bayesian_elo.predict_with_uncertainty(
            game_context["home_team"], game_context["away_team"])["std_prob"]
        outputs["regime_transition"] = game_context.get("regime_transition_flag", 0)
        outputs["day_of_season"] = game_context.get("day_of_season", 0)  # 1-180
        
        return outputs
    
    def _calculate_agreement(self, outputs: dict) -> float:
        """How much do the base models agree? Range: 0 (total disagreement) to 1 (consensus)."""
        probs = [outputs["elo_prob"], outputs["hmm_prob"], outputs["xgb_prob"], outputs["market_prob"]]
        return 1.0 - np.std(probs) * 4  # Normalize so 0 = max disagreement
```

---

## Step 21.2 — Meta-Learner (Level-2 Model)

### File: `NEW → monolith/ml/stacking/meta_learner.py`

```python
class MetaLearner:
    """
    A second-stage model that learns the optimal combination of base models.
    
    Input: predictions from all base models + context features
    Output: final calibrated probability
    
    Key insight: this model learns INTERACTIONS between context and base models.
    For example, it might learn:
    - "When model_agreement > 0.8 AND bayesian_uncertainty < 0.04, trust the consensus"
    - "When games_into_season < 20, downweight elo_prob and upweight market_prob"
    - "When regime_transition = 1, upweight hmm_prob by 3x"
    
    These are patterns too complex for a human to hand-tune.
    """
    
    def __init__(self):
        self.meta_model = LogisticRegression(C=0.1)  # Regularized to prevent over-stacking
        # Alternative: XGBoost meta-learner for non-linear interactions
        self.meta_xgb = xgb.XGBClassifier(
            n_estimators=50,  # Intentionally small to prevent overfitting
            max_depth=3,
            learning_rate=0.1,
            reg_alpha=1.0,    # Strong regularization
        )
    
    def train(self, base_predictions: pd.DataFrame, actual_outcomes: pd.Series):
        """
        Train on out-of-fold base model predictions.
        
        CRITICAL: Must use out-of-fold predictions to avoid information leakage.
        If we train the meta-learner on the same data the base models saw,
        it will overfit to their training-set predictions.
        
        Method: 5-fold time-series split
        1. Train base models on folds 1-4
        2. Generate base predictions on fold 5 (out-of-fold)
        3. After all folds, train meta-learner on all out-of-fold predictions
        """
        # Time-series split ensures no future data leaks
        tscv = TimeSeriesSplit(n_splits=5)
        
        oof_predictions = pd.DataFrame()
        
        for train_idx, val_idx in tscv.split(base_predictions):
            # Generate out-of-fold predictions from each base model
            fold_preds = self._generate_oof_predictions(
                base_predictions.iloc[train_idx],
                base_predictions.iloc[val_idx],
                actual_outcomes.iloc[train_idx],
            )
            oof_predictions = pd.concat([oof_predictions, fold_preds])
        
        # Train meta-learner on out-of-fold predictions only
        self.meta_xgb.fit(oof_predictions, actual_outcomes)
    
    def predict(self, base_outputs: dict) -> dict:
        """
        Final prediction: meta-learner combines all base model outputs.
        """
        features = pd.DataFrame([base_outputs])
        final_prob = float(self.meta_xgb.predict_proba(features)[0][1])
        
        # Also return model contribution analysis
        contributions = self._get_model_contributions(base_outputs)
        
        return {
            "final_prob": final_prob,
            "model_contributions": contributions,
            "top_model": max(contributions, key=contributions.get),
            "agreement_score": base_outputs["model_agreement"],
        }
    
    def _get_model_contributions(self, base_outputs: dict) -> dict:
        """Which base model is driving tonight's prediction?"""
        # Use SHAP values to decompose the meta-learner's prediction
        import shap
        explainer = shap.TreeExplainer(self.meta_xgb)
        shap_values = explainer.shap_values(pd.DataFrame([base_outputs]))
        
        feature_names = list(base_outputs.keys())
        contributions = {}
        for i, name in enumerate(feature_names):
            if name.endswith("_prob"):
                contributions[name] = float(abs(shap_values[0][i]))
        
        # Normalize to percentages
        total = sum(contributions.values())
        return {k: v/total for k, v in contributions.items()}
```

---

## Step 21.3 — Dynamic Weight Visualization

```python
class StackingDashboard:
    """
    Track how the meta-learner's implicit weights shift over the season.
    
    Visualizations:
    1. Line chart: model contribution % over time
       → Shows Elo gaining trust as season progresses
    2. Heatmap: model contribution by game context type
       → Shows HMM dominates regime-transition games
    3. Agreement vs Performance: when models disagree, who's right?
       → Reveals which model to trust in disputed calls
    """
    
    def generate_contribution_report(self, date_range) -> dict:
        """Monthly report on which models are earning their weight."""
        monthly_data = self._get_predictions_in_range(date_range)
        
        return {
            "avg_contributions": {
                model: np.mean([p["model_contributions"][model] for p in monthly_data])
                for model in self.BASE_MODELS
            },
            "best_model_when_disagreeing": self._analyze_disagreements(monthly_data),
            "meta_vs_static_brier": self._compare_meta_vs_static(monthly_data),
        }
```

---

## Why This Is Better Than Static Blending

```
Static blend: Elo(25%) + XGB(35%) + HMM(20%) + Market(20%)
Always the same weights, regardless of context.

Meta-learner example outputs:

Game 1: Celtics vs Pistons (December, no injuries, all models agree)
→ Meta weights: Elo(30%) + XGB(40%) + HMM(10%) + Market(20%)
→ High agreement = trust the ensemble, downweight volatile HMM

Game 2: Lakers vs Warriors (March, LeBron OUT, models disagree)  
→ Meta weights: Elo(10%) + XGB(20%) + HMM(15%) + Market(25%) + PlayerImpact(30%)
→ Injury = trust player impact model heavily

Game 3: Nuggets vs Jazz (April, playoff race, regime transition detected)
→ Meta weights: Elo(15%) + XGB(25%) + HMM(35%) + Market(15%) + Absorbing(10%)
→ Regime shift = trust HMM heavily, playoff dynamics = weight absorbing chain
```

### Verification
- [ ] Meta-learner Brier score should be ≤ static blend Brier score on validation data
- [ ] On games where base models disagree, meta-learner should pick the right model ≥60% of the time
- [ ] Contribution report should show sensible patterns (market weight higher early season, Elo higher late)

## Dependencies
- `shap` (for model contribution analysis)
- `scikit-learn` (LogisticRegression, TimeSeriesSplit)
- `xgboost` (already installed)
