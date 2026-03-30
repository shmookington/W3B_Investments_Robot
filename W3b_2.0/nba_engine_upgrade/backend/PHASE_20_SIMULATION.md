# Phase 16: Simulation & Synthetic Data Generation
### *Monte Carlo Season Simulation, Agent-Based Market Modeling, and Stress Testing*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech ran millions of simulations before committing real capital. They simulated not just the market, but the other participants in the market. We simulate entire NBA seasons and the betting market itself.
> **Priority:** 🟡 High | **Estimated Effort:** 4-5 days | **Impact:** Confidence calibration + stress testing + training data augmentation

---

## Overview

We have ~1,230 NBA games per season. That's a small dataset for training ML models. RenTech solved this in finance by generating **synthetic data** that preserves the statistical properties of real data but gives you 100x more training examples. We do the same.

---

## Step 16.1 — Full Season Monte Carlo Simulator

### File: `NEW → monolith/simulation/season_simulator.py`

```python
class SeasonSimulator:
    """
    Simulate complete NBA seasons using our model's probability outputs.
    
    Each simulation:
    1. Starts with the real schedule and current team strengths
    2. For each game, samples the winner using our model's P(home win)
    3. Updates Elo/HMM states after each simulated game
    4. Tracks simulated standings, playoff seeding, and team trajectories
    
    Run 10,000 simulations to get distributions over:
    - Each team's final win total (±3 games, 95% CI)
    - Playoff matchups and their probabilities
    - Championship odds for each team
    """
    
    def simulate_season(self, remaining_games: List[Game], 
                         current_ratings: dict) -> SeasonResult:
        ratings = copy.deepcopy(current_ratings)
        results = []
        
        for game in remaining_games:
            # Get win probability from full model  
            p_home = self.model.predict(game.home, game.away, ratings)
            
            # Sample outcome
            home_won = random.random() < p_home
            
            # Simulate margin (normal distribution centered on expected margin)
            expected_margin = (p_home - 0.5) * 20  # Rough conversion
            margin = int(np.random.normal(expected_margin, 8))
            
            # Update ratings for subsequent games
            self._update_ratings(ratings, game, home_won, margin)
            results.append(SimulatedGame(game, home_won, margin))
        
        return SeasonResult(results, self._calculate_standings(results))
    
    def run_monte_carlo(self, n_sims=10000) -> dict:
        """Run 10K season simulations and aggregate results."""
        all_standings = []
        for i in range(n_sims):
            result = self.simulate_season(self.remaining_games, self.current_ratings)
            all_standings.append(result.standings)
        
        return {
            team: {
                "median_wins": np.median([s[team] for s in all_standings]),
                "win_range_90": (np.percentile([s[team] for s in all_standings], 5),
                                  np.percentile([s[team] for s in all_standings], 95)),
                "playoff_prob": np.mean([s[team] >= PLAYOFF_THRESHOLD for s in all_standings]),
                "championship_prob": np.mean([self._sim_playoffs(s)[0] == team for s in all_standings]),
            }
            for team in ALL_TEAMS
        }
```

---

## Step 16.2 — Synthetic Training Data Generator

### File: `NEW → monolith/simulation/synthetic_data.py`

```python
class SyntheticDataGenerator:
    """
    Generate realistic synthetic NBA games to augment training data.
    
    Problem: We only have ~4,000 games across 3 seasons.
    Solution: Generate 100,000 synthetic games that preserve
    the statistical properties of real games but create new examples.
    
    Uses a Generative Adversarial approach:
    1. Learn the joint distribution of (features → outcome)
    2. Sample new feature vectors from the learned distribution
    3. Assign outcomes probabilistically
    4. Verify synthetic data has same statistical properties as real data
    """
    
    def generate_synthetic_games(self, n_games: int = 100000) -> pd.DataFrame:
        """
        Generate synthetic feature vectors and outcomes.
        
        Method: Gaussian Copula
        - Fits marginal distributions for each feature independently
        - Fits the correlation structure between features
        - Samples from the joint distribution
        """
        from sdv.tabular import GaussianCopula
        
        model = GaussianCopula()
        model.fit(self.real_training_data)
        
        synthetic = model.sample(n_games)
        
        # Validate: synthetic should have same feature distributions
        self._validate_synthetic(synthetic, self.real_training_data)
        
        return synthetic
    
    def _validate_synthetic(self, synthetic, real):
        """
        Kolmogorov-Smirnov test on each feature.
        If any feature has p < 0.05, the synthetic data is bad.
        """
        from scipy.stats import ks_2samp
        for col in real.columns:
            stat, p_value = ks_2samp(real[col], synthetic[col])
            if p_value < 0.05:
                logger.warning(f"Synthetic {col} differs from real (KS p={p_value:.4f})")
```

---

## Step 16.3 — Agent-Based Betting Market Simulation

### File: `NEW → monolith/simulation/market_sim.py`

```python
class BettingMarketSimulator:
    """
    Simulate the betting MARKET itself to understand how lines move.
    
    Agent types:
    - PUBLIC (70% of bets): biased toward favorites, popular teams, overs
    - SHARP (20% of bets): uses models similar to ours, moves lines efficiently
    - SYNDICATE (10% of bets): large coordinated action, causes steam moves
    
    The sportsbook agent adjusts lines based on incoming action.
    
    Purpose: understand when our signals are likely to persist (public
    hasn't moved the line yet) vs when they'll be arbitraged away
    (sharps are already on it).
    """
    
    def simulate_market(self, true_prob: float, n_bettors: int = 1000):
        line = self._true_prob_to_opening_line(true_prob)
        
        for bettor in self._generate_bettors(n_bettors):
            if bettor.type == "PUBLIC":
                side = self._public_bias(line, bettor.favorite_team)
            elif bettor.type == "SHARP":
                side = self._sharp_analysis(line, true_prob)
            else:
                side = self._syndicate_action(line, true_prob)
            
            line = self._bookmaker_adjust(line, side, bettor.bet_size)
        
        return {
            "opening_line": self._true_prob_to_opening_line(true_prob),
            "closing_line": line,
            "clv_available": line - self._true_prob_to_opening_line(true_prob),
        }
```

---

## Step 16.4 — Stress Testing & Worst-Case Scenarios

```python
class StressTester:
    """
    RenTech stress-tested against extreme scenarios daily.
    
    Scenarios to simulate:
    1. "Black Swan" — 10 straight losses on high-confidence signals
    2. "Model Breakdown" — model calibration suddenly off by 5%
    3. "Sharp Convergence" — our signals get arbitraged within 10 minutes
    4. "Data Outage" — injury data stops updating for 6 hours
    5. "Regime Shift" — sudden change in NBA play style (e.g., 3-point revolution)
    """
    
    def run_stress_test(self, scenario: str) -> dict:
        """Returns: max drawdown, recovery time, capital at risk."""
```

---

## Dependencies
- `sdv` (Synthetic Data Vault - for Gaussian Copula generation)
- `scipy.stats` (KS tests for validation)
- Historical game data (from Phase 1 DB)
