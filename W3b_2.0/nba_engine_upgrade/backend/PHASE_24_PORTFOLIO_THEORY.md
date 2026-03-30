# Phase 19: Portfolio Theory for Sports
### *Treating Tonight's Slate as a Portfolio, Not Isolated Bets*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech never thought about individual positions in isolation. Every trade was part of a portfolio. Correlations between positions determined sizing. A portfolio that looks diversified but is secretly correlated is a ticking time bomb. We apply Markowitz Portfolio Theory to sports bets.
> **Priority:** 🟡 High | **Estimated Effort:** 3-4 days | **Impact:** Reduces variance 20-30% by properly accounting for correlation between bets

---

## Overview

On a typical NBA night, we might have 4-6 games with positive edge. The naive approach: bet each independently. The RenTech approach: treat them as a **portfolio** and optimize the combined risk/reward.

Why this matters: if you bet on the Celtics AND the Knicks on the same night, and both teams are in the Eastern Conference — those bets are **correlated.** If the Eastern Conference has a bad night (e.g., scheduling disadvantage), both bets lose simultaneously. Proper portfolio construction accounts for this.

---

## Step 19.1 — Bet Correlation Matrix

### File: `NEW → monolith/models/portfolio/correlation.py`

```python
class BetCorrelationAnalyzer:
    """
    Calculate the correlation between tonight's bets.
    
    Sources of correlation:
    1. Same conference → +0.15 correlation
    2. Same division → +0.25 correlation
    3. Back-of-the-schedule day (all teams fatigued) → +0.20 correlation
    4. Weather event affecting multiple cities → +0.10 correlation
    5. Shared opponent in recent games → +0.10 correlation
    6. Same referee crew tendencies → +0.05 correlation
    """
    
    def build_correlation_matrix(self, signals: List[Signal]) -> np.array:
        n = len(signals)
        corr = np.eye(n)
        
        for i in range(n):
            for j in range(i + 1, n):
                rho = self._estimate_correlation(signals[i], signals[j])
                corr[i][j] = rho
                corr[j][i] = rho
        
        return corr
    
    def _estimate_correlation(self, sig_a: Signal, sig_b: Signal) -> float:
        rho = 0.0
        
        # Conference correlation
        if self._same_conference(sig_a.team, sig_b.team):
            rho += 0.15
        
        # Division correlation
        if self._same_division(sig_a.team, sig_b.team):
            rho += 0.10  # Additional to conference
        
        # If betting on opposing sides of same game → perfectly anti-correlated
        if sig_a.event_id == sig_b.event_id:
            rho = -1.0
        
        # Both home teams or both away teams → correlated through HCA
        if sig_a.side == sig_b.side:
            rho += 0.05
        
        # Regime correlation: if both teams are in similar HMM states
        if abs(sig_a.regime_state - sig_b.regime_state) <= 1:
            rho += 0.08
        
        return min(rho, 0.95)  # Cap at 0.95 (never perfectly correlated)
```

---

## Step 19.2 — Markowitz Mean-Variance Optimizer

### File: `NEW → monolith/models/portfolio/optimizer.py`

```python
class BettingPortfolioOptimizer:
    """
    Markowitz Mean-Variance Optimization adapted for sports bets.
    
    Instead of: bet Kelly fraction independently on each game
    Do: find the allocation across all games on tonight's slate
        that maximizes expected return for a given risk tolerance
    
    Key difference from finance: sports bets are binary (win/lose),
    not continuous. We use a modified Markowitz for Bernoulli outcomes.
    """
    
    def optimize_portfolio(self, signals: List[Signal], 
                            max_total_risk: float = 0.15) -> dict:
        """
        Find optimal allocation across tonight's signals.
        
        Args:
            signals: List of tonight's positive-edge signals
            max_total_risk: Maximum total bankroll allocated tonight (15%)
        
        Returns: allocation per signal, total expected return, portfolio risk
        """
        n = len(signals)
        
        # Expected returns (edge on each signal)
        mu = np.array([s.edge for s in signals])
        
        # Correlation matrix
        corr = self.correlation_analyzer.build_correlation_matrix(signals)
        
        # Variance of each bet (binary Bernoulli)
        variances = np.array([s.predicted_prob * (1 - s.predicted_prob) for s in signals])
        
        # Covariance matrix
        sigma = np.outer(np.sqrt(variances), np.sqrt(variances)) * corr
        
        # Optimize: maximize Sharpe ratio subject to constraints
        from scipy.optimize import minimize
        
        def neg_sharpe(weights):
            port_return = weights @ mu
            port_risk = np.sqrt(weights @ sigma @ weights)
            return -port_return / max(port_risk, 1e-6)
        
        constraints = [
            {"type": "ineq", "fun": lambda w: max_total_risk - sum(w)},
            {"type": "ineq", "fun": lambda w: w},  # All non-negative
        ]
        bounds = [(0, max_total_risk / n * 2) for _ in range(n)]
        
        result = minimize(neg_sharpe, x0=np.ones(n) / n * max_total_risk,
                         bounds=bounds, constraints=constraints)
        
        allocations = result.x
        return {
            "allocations": {signals[i].event_id: float(allocations[i]) for i in range(n)},
            "expected_return": float(allocations @ mu),
            "portfolio_risk": float(np.sqrt(allocations @ sigma @ allocations)),
            "sharpe": float(-result.fun),
            "diversification_ratio": float(sum(np.sqrt(variances) * allocations) / 
                                           np.sqrt(allocations @ sigma @ allocations)),
        }
```

---

## Step 19.3 — Hedging & Risk Reduction

```python
class HedgingEngine:
    """
    Sometimes the optimal move is to hedge.
    
    Scenario: We bet Celtics -5.5 at +100 pre-game.
    At halftime, Celtics are up 15. Live line is now Celtics -10.5.
    We can bet the other side (opponent +10.5) to lock in profit.
    
    The hedging engine calculates:
    - When to hedge (midgame, based on live Markov probability)
    - How much to hedge (partial vs full)
    - Which book has the best hedge line
    """
    
    def calculate_hedge(self, original_bet: PlacedBet, 
                         current_live_line: float) -> dict:
        """
        Should we hedge this bet, and how?
        """
        original_implied = american_to_implied(original_bet.odds)
        current_implied = american_to_implied(current_live_line)
        
        # If our position has improved significantly
        if current_implied > original_implied + 0.15:
            # Calculate hedge amount for guaranteed profit
            hedge_amount = (original_bet.amount * original_bet.decimal_odds) / \
                          (1 + american_to_decimal(current_live_line))
            
            guaranteed_profit = original_bet.potential_payout - original_bet.amount - hedge_amount
            
            return {
                "should_hedge": guaranteed_profit > 0,
                "hedge_amount": hedge_amount,
                "guaranteed_profit": guaranteed_profit,
                "hedge_side": "away" if original_bet.side == "home" else "home",
            }
```

---

## Dependencies
- `scipy.optimize` (portfolio optimization)
- `numpy` (linear algebra)
- Correlation data from Phase 14 (conference, division structure)
