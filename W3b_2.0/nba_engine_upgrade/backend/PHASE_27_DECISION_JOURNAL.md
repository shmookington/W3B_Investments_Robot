# Phase 26: Systematic Decision Journal & Post-Mortem Engine
### *Ray Dalio's Framework — Radical Transparency Applied to Every Bet*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Inspired by:** **Ray Dalio** — founder of Bridgewater Associates ($150B AUM). Dalio's "Principles" framework demands radical transparency: every decision is logged, every mistake is analyzed, and the system systematically improves from failures. His "believability-weighted decision-making" ensures the most reliable signals get the most influence.
> **Priority:** 🟡 High | **Estimated Effort:** 3-4 days | **Impact:** Systematic learning from mistakes + prevents repeating errors

---

## Overview

Most bettors track W/L and P&L. Dalio would call that insane. You're judging *outcomes* when you should be judging *process.* A bet can be correct process and lose (bad luck). A bet can be terrible process and win (good luck). Only by systematically logging the *reasoning* behind every bet can you separate skill from luck and actually improve.

---

## Step 26.1 — Pre-Mortem Decision Logger

### File: `NEW → monolith/journal/pre_mortem.py`

```python
class PreMortemLogger:
    """
    Before every signal is sent, log WHY the system recommended it.
    
    Dalio's rule: "If you can't state the specific reasons for a decision,
    you shouldn't be making it."
    
    Every signal gets a decision record BEFORE the game starts.
    This prevents hindsight bias ("I knew that was a bad bet").
    """
    
    def log_decision(self, signal: Signal) -> dict:
        decision_record = {
            "timestamp": datetime.utcnow(),
            "game_id": signal.event_id,
            "signal_side": signal.side,
            
            # WHY are we betting this?
            "primary_edge_source": self._identify_primary_source(signal),
            "model_probability": signal.predicted_prob,
            "market_probability": signal.market_implied_prob,
            "edge_size": signal.edge,
            
            # Model agreement (Dalio's "believability weighting")
            "models_agreeing": self._count_agreeing_models(signal),
            "models_disagreeing": self._count_disagreeing_models(signal),
            "meta_learner_contribution": signal.model_contributions,
            
            # What could go WRONG? (Pre-mortem)
            "risk_factors": self._identify_risks(signal),
            "trap_risk_score": signal.trap_risk,
            "key_assumptions": self._list_assumptions(signal),
            
            # What is our expected outcome distribution?
            "expected_ev": signal.expected_value,
            "kelly_fraction": signal.kelly_fraction,
            "confidence_tier": signal.confidence,
        }
        
        self.db.insert("decision_journal", decision_record)
        return decision_record
    
    def _identify_risks(self, signal: Signal) -> List[str]:
        """
        Pre-mortem: "Imagine this bet lost. What went wrong?"
        """
        risks = []
        if signal.injury_data_stale > 120:  # minutes
            risks.append("Injury data is 2+ hours old — late scratch possible")
        if signal.edge < 0.03:
            risks.append("Edge is thin (< 3%) — line movement could eliminate it")
        if signal.trap_risk > 0.3:
            risks.append("Possible trap line — limited confirming sharp action")
        if not signal.sharp_action_detected:
            risks.append("No sharp confirmation — we're alone on this side")
        if signal.model_agreement < 0.6:
            risks.append("Models disagree — meta-learner is resolving a split vote")
        return risks
```

---

## Step 26.2 — Post-Mortem Analyzer

```python
class PostMortemAnalyzer:
    """
    After every game resolves, compare what we EXPECTED to what HAPPENED.
    
    Dalio's framework:
    1. Was the decision good? (process evaluation)
    2. Was the outcome good? (result evaluation)
    3. LEARN from the gap between 1 and 2
    
    The 4 outcomes:
    ┌────────────┬──────────────┬──────────────────────────┐
    │            │ Good Outcome │ Bad Outcome              │
    ├────────────┼──────────────┼──────────────────────────┤
    │ Good       │ SKILLED      │ BAD LUCK (keep betting)  │
    │ Process    │ (ideal)      │ (don't change strategy)  │
    ├────────────┼──────────────┼──────────────────────────┤
    │ Bad        │ GOOD LUCK    │ MISTAKE                  │
    │ Process    │ (dangerous)  │ (fix the process)        │
    └────────────┴──────────────┴──────────────────────────┘
    """
    
    def analyze_bet(self, decision_record: dict, game_result: dict) -> dict:
        """Classify each bet into the 4 Dalio quadrants."""
        
        # Was the process good?
        good_process = all([
            decision_record["edge_size"] >= 0.03,         # Minimum edge
            decision_record["models_agreeing"] >= 3,       # Consensus
            decision_record["trap_risk_score"] < 0.5,      # Not likely a trap
            decision_record["kelly_fraction"] <= 0.05,     # Not over-sized
        ])
        
        # Was the outcome good?
        good_outcome = game_result["won"]
        
        # CLV check: did we beat the closing line?
        positive_clv = game_result["clv_cents"] > 0
        
        # Classify
        if good_process and good_outcome:
            quadrant = "SKILLED"
            lesson = "Process and outcome aligned. Continue."
        elif good_process and not good_outcome:
            quadrant = "BAD_LUCK"
            lesson = "Process was sound. Don't overreact. Variance happens."
        elif not good_process and good_outcome:
            quadrant = "GOOD_LUCK"
            lesson = "WARNING: Won despite poor process. Fix the process."
        else:
            quadrant = "MISTAKE"
            lesson = "INVESTIGATE: What assumption was wrong?"
        
        return {
            "quadrant": quadrant,
            "lesson": lesson,
            "process_score": good_process,
            "had_positive_clv": positive_clv,
            "risk_factors_that_materialized": self._check_which_risks_hit(
                decision_record["risk_factors"], game_result
            ),
        }
    
    def weekly_review(self) -> dict:
        """
        Dalio's weekly reflection meeting, automated.
        
        Generate a report:
        - What % of bets fell into each quadrant?
        - Which risk factors materialized most often?
        - Which models were most "believable" this week?
        - What should change next week?
        """
```

---

## Step 26.3 — Believability-Weighted Signals

```python
class BelievabilityEngine:
    """
    Dalio's "believability weighting" — not all opinions are equal.
    
    In betting terms: not all model signals are equally reliable.
    Track each model's historical accuracy in different contexts,
    then weight future signals by demonstrated believability.
    
    This is similar to Phase 21 (meta-learning) but with an explicit
    "track record" for each model in specific situations.
    """
    
    def update_believability(self, model_name: str, context: str, 
                              was_correct: bool):
        """
        After each game, update each model's believability in this context.
        
        Contexts: 'home_favorite', 'road_underdog', 'back_to_back',
                  'division_game', 'national_tv', 'playoff', etc.
        """
        key = f"{model_name}:{context}"
        self.track_record[key]["total"] += 1
        if was_correct:
            self.track_record[key]["correct"] += 1
        
        # Bayesian believability (Beta distribution posterior)
        alpha = self.track_record[key]["correct"] + 1  # Prior: Beta(1,1)
        beta = self.track_record[key]["total"] - self.track_record[key]["correct"] + 1
        self.believability[key] = alpha / (alpha + beta)
```

---

## Verification
- [ ] Every signal for 30 days gets a pre-mortem record + post-mortem analysis
- [ ] Weekly review report generated automatically every Monday
- [ ] Quadrant distribution should converge to ≥60% SKILLED over time
- [ ] Risk factors that materialize most often should be upweighted in future pre-mortems

## Dependencies
- PostgreSQL (decision journal table)
- Telegram (weekly review alerts)
