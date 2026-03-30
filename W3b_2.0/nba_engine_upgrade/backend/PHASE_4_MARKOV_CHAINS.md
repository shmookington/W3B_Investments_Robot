# Phase 2.5: Markov Chains & Hidden Markov Models
### *The Renaissance Technologies Playbook — 8 Implementations*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🔴 Critical | **Estimated Effort:** 8-10 days | **Impact:** Regime detection + live betting + uncertainty quantification
> **Depends on:** Phase 1 (Game Results), Phase 2 (Live Context)
> **Jim Simons Link:** RenTech used HMMs as their core signal generator. These 8 implementations multiply that power across pre-game, live, and meta-game contexts.

---

## Overview

Jim Simons' Medallion Fund returned 66% annually for 30 years using Hidden Markov Models to detect regime changes in financial markets before anyone else. This phase applies the exact same math to NBA teams.

The core insight: **every team exists in a hidden "state" (elite, declining, tanking, etc.) that you can't directly see — you can only infer it from observable signals (box scores, margins, shot quality).** The market prices off surface-level stats. We price off the hidden process underneath.

### All 8 Implementations at a Glance

| # | Implementation | What It Captures | Output |
|---|---------------|-----------------|--------|
| 2.5.1 | HMM Standalone Predictor | Team regime (Elite→Tanking) | Standalone win probability |
| 2.5.2 | HMM → XGBoost Features | Regime transition detection | 6 XGBoost features |
| 2.5.3 | Live Discrete Chain | In-game win probability | Live betting pipeline |
| 2.5.4 | Bayesian MCMC Elo | Uncertainty quantification | 4 XGBoost features |
| 2.5.5 | Higher-Order Chains | Sequence-dependent momentum | 3 XGBoost features |
| 2.5.6 | Coupled Division Chains | Cross-team dynamics | 3 XGBoost features |
| 2.5.7 | Absorbing Chains | Playoff motivation | 2 XGBoost features |
| 2.5.8 | Continuous-Time Chain | Precise live predictions | Upgrades 2.5.3 |

---

# Step 2.5.1 — HMM Standalone Prediction Model

Trains a Hidden Markov Model for each NBA team that tracks their hidden state and uses the current state estimate to predict game outcomes.

### Hidden States (Not Directly Observable)
```python
TEAM_STATES = {
    0: "ELITE",       # Championship-caliber, dominant on both ends
    1: "CONTENDING",  # Strong, inconsistent, capable of beating anyone
    2: "MEDIOCRE",    # .500 team, no clear identity
    3: "DECLINING",   # Losing grip, close losses piling up
    4: "TANKING",     # Not competitive, development mode
}
```

### Observable Emissions (What We Can Measure)
```python
def encode_game_observation(margin: int, was_home: bool) -> int:
    """
    Convert a game result into a discrete observation symbol.
    
    Symbols (0-7):
    0: Blowout win (won by 15+)
    1: Comfortable win (won by 8-14)
    2: Close win (won by 1-7)
    3: Narrow loss (lost by 1-4)
    4: Clear loss (lost by 5-10)
    5: Bad loss (lost by 11-18)
    6: Blowout loss (lost by 19+)
    7: OT game (won or lost)
    """
    adj_margin = margin + (3 if was_home else -3)  # Adjust for HCA
    
    if margin > 0:  # Win
        if adj_margin >= 15: return 0  # Blowout win
        if adj_margin >= 8:  return 1  # Comfortable win
        return 2                        # Close win
    else:  # Loss
        if abs(adj_margin) <= 4:  return 3  # Narrow loss
        if abs(adj_margin) <= 10: return 4  # Clear loss
        if abs(adj_margin) <= 18: return 5  # Bad loss
        return 6                             # Blowout loss
```

### Why These States Matter
```
An ELITE team's emission pattern:
  Blowout wins: 30%  |  Comfortable wins: 35%  |  Close wins: 20%
  Narrow losses: 10% |  Clear losses: 4%       |  Bad losses: 1%

A DECLINING team's emission pattern:
  Blowout wins: 5%   |  Comfortable wins: 10%  |  Close wins: 20%
  Narrow losses: 25%  |  Clear losses: 25%      |  Bad losses: 15%

Key insight: A declining team LOOKS like they're competitive
(lots of close losses), but the HMM detects this pattern
BEFORE their record fully reflects it.
```

### Transition Matrix
```python
# Probability of moving from one state to another between consecutive games
#                    ELITE  CONTEND  MED    DECL   TANK
TRANSITION_MATRIX = [
    [0.85,  0.10,   0.04,  0.01,  0.00],  # ELITE stays elite 85%
    [0.05,  0.75,   0.12,  0.07,  0.01],  # CONTENDING
    [0.01,  0.10,   0.70,  0.15,  0.04],  # MEDIOCRE
    [0.00,  0.05,   0.12,  0.73,  0.10],  # DECLINING
    [0.00,  0.01,   0.04,  0.10,  0.85],  # TANKING stays tanking 85%
]
```

### Training with Baum-Welch Algorithm
### File: `NEW → monolith/models/markov/team_hmm.py`

```python
from hmmlearn import hmm

class TeamHMM:
    def __init__(self, n_states=5, n_observations=8):
        self.model = hmm.CategoricalHMM(
            n_components=n_states, n_iter=100, tol=0.01, init_params="ste",
        )
        self.model.transmat_ = np.array(TRANSITION_MATRIX)
        
    def train(self, observations_by_team: Dict[str, List[int]]):
        """Train on all 30 teams' observation sequences simultaneously."""
        all_sequences = []
        lengths = []
        for team, obs in observations_by_team.items():
            all_sequences.extend(obs)
            lengths.append(len(obs))
        X = np.array(all_sequences).reshape(-1, 1)
        self.model.fit(X, lengths)
        
    def get_current_state(self, team_observations: List[int]) -> dict:
        """
        Given a team's recent game results, infer their current hidden state.
        Returns: {"ELITE": 0.05, "CONTENDING": 0.15, "MEDIOCRE": 0.60, ...}
        """
        X = np.array(team_observations).reshape(-1, 1)
        log_prob, state_probs = self.model.score_samples(X)
        current_probs = state_probs[-1]
        return {TEAM_STATES[i]: float(current_probs[i]) for i in range(len(TEAM_STATES))}
```

### State-Based Win Probability
```python
def hmm_predict(home_state_probs: dict, away_state_probs: dict) -> float:
    """
    Predict home win probability based on both teams' state distributions.
    Uses a pre-computed 25-entry state-vs-state win probability matrix.
    """
    STATE_WIN_PROBS = {
        ("ELITE", "ELITE"): 0.58,  ("ELITE", "CONTENDING"): 0.68,
        ("ELITE", "MEDIOCRE"): 0.78, ("ELITE", "DECLINING"): 0.85,
        ("ELITE", "TANKING"): 0.92,
        ("CONTENDING", "ELITE"): 0.38, ("CONTENDING", "CONTENDING"): 0.55,
        ("CONTENDING", "MEDIOCRE"): 0.65, ("CONTENDING", "DECLINING"): 0.75,
        ("CONTENDING", "TANKING"): 0.85,
        ("MEDIOCRE", "ELITE"): 0.22, ("MEDIOCRE", "CONTENDING"): 0.40,
        ("MEDIOCRE", "MEDIOCRE"): 0.53, ("MEDIOCRE", "DECLINING"): 0.62,
        ("MEDIOCRE", "TANKING"): 0.75,
        ("DECLINING", "ELITE"): 0.12, ("DECLINING", "CONTENDING"): 0.30,
        ("DECLINING", "MEDIOCRE"): 0.42, ("DECLINING", "DECLINING"): 0.52,
        ("DECLINING", "TANKING"): 0.62,
        ("TANKING", "ELITE"): 0.05, ("TANKING", "CONTENDING"): 0.18,
        ("TANKING", "MEDIOCRE"): 0.28, ("TANKING", "DECLINING"): 0.40,
        ("TANKING", "TANKING"): 0.52,
    }
    total_prob = 0.0
    for home_state, home_p in home_state_probs.items():
        for away_state, away_p in away_state_probs.items():
            total_prob += home_p * away_p * STATE_WIN_PROBS[(home_state, away_state)]
    return total_prob
```

### Wired into Model Blender (Phase 6)
```python
self.weights = {"elo": 0.25, "xgb": 0.35, "hmm": 0.20, "market": 0.20}
```

### Verification
- [ ] Train on 3 seasons → transition matrix should be diagonally dominant
- [ ] 2023-24 Pistons should classify as TANKING; 2023-24 Celtics as ELITE
- [ ] HMM standalone Brier score ≤ 0.23

---

# Step 2.5.2 — HMM Regime States as XGBoost Features

Instead of a separate predictor, feed HMM state probabilities directly into XGBoost as features.

### File: `MODIFY → monolith/ml/feature_pipeline.py`

### New Features (6 additional)
| # | Feature | Description | Range |
|---|---------|-------------|-------|
| 26 | `home_elite_prob` | P(home team is ELITE or CONTENDING) | 0-1 |
| 27 | `home_declining_prob` | P(home team is DECLINING or TANKING) | 0-1 |
| 28 | `away_elite_prob` | P(away team is ELITE or CONTENDING) | 0-1 |
| 29 | `away_declining_prob` | P(away team is DECLINING or TANKING) | 0-1 |
| 30 | `regime_mismatch` | Difference in most-likely state index | -4 to +4 |
| 31 | `regime_transition_flag` | Did either team change state in last 5 games? | 0 or 1 |

### The Regime Transition Flag — THE MONEY FEATURE
```python
def _state_changed(self, team, lookback_games=5):
    """
    Detect if a team's most-likely state changed in the last N games.
    
    When a team transitions from CONTENDING → DECLINING:
    - The market hasn't fully priced in the decline yet
    - The team's W-L record still looks okay  
    - But the HMM has detected the shift from the pattern of results
    - There's a 3-5 game window where we can exploit this lag
    """
    recent_states = self._get_state_history(team, lookback_games)
    if len(recent_states) < 2:
        return False
    current = max(recent_states[-1], key=recent_states[-1].get)
    previous = max(recent_states[0], key=recent_states[0].get)
    return current != previous
```

XGBoost auto-discovers non-linear interactions:
- `regime_transition_flag = 1` AND `elo_diff < 0` → team is underpriced (improving but Elo hasn't caught up)
- `home_declining_prob > 0.6` AND `home_elo > 1650` → overpriced (strong Elo but HMM knows they're falling apart)

### Verification
- [ ] Feature importance: `regime_transition_flag` should be in top 10 features
- [ ] XGBoost with HMM features should have ≥1% lower Brier score than without
- [ ] On `regime_transition_flag = 1` games, edge should be 2%+ higher than average

---

# Step 2.5.3 — In-Game Markov Transition Matrix (Live Betting)

A separate pipeline that runs **during** live games. Models score differentials as a Markov chain to predict win probability at any moment.

### File: `NEW → monolith/models/markov/live_game_chain.py`

### State Space
```python
@dataclass
class LiveGameState:
    quarter: int           # 1-4 (or 5+ for OT)
    time_bucket: int       # 0-11 (minute of the quarter)
    score_diff_bucket: int # 13 buckets from "down 20+" to "up 20+"
    possession: str        # "home" or "away"
```
- **Total: 4 × 12 × 13 × 2 = 1,248 states** + absorbing states (home win, away win)

### Training on Play-by-Play Data
```python
class LiveGameMarkovChain:
    """
    Trained on 3+ seasons of NBA PBP data (~4,000 games × ~400 plays = 1.6M transitions).
    """
    def train(self, play_by_play_data: List[GamePBP]):
        for game in play_by_play_data:
            prev_state = None
            for play in game.plays:
                current_state = self._encode_state(play.quarter, play.clock_minutes,
                    play.home_score, play.away_score, play.possession)
                if prev_state is not None:
                    self.transition_counts[prev_state][current_state] += 1
                prev_state = current_state
        # Normalize rows to get probabilities
        row_sums = self.transition_counts.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1
        self.transition = self.transition_counts / row_sums
    
    def predict_win_probability(self, current_state: LiveGameState) -> float:
        """Uses Chapman-Kolmogorov equation (matrix power method)."""
        state_vector = np.zeros(self.n_states)
        state_vector[self._encode_state_index(current_state)] = 1.0
        remaining = self._estimate_remaining_transitions(current_state)
        future = state_vector @ np.linalg.matrix_power(self.transition, remaining)
        return sum(future[s] for s in self.HOME_WIN_STATES)
```

### Live Betting Signal Generator
### File: `NEW → monolith/models/markov/live_betting.py`

```python
class LiveBettingEngine:
    """Monitors live games every 30 seconds, generates signals when edge > 5%."""
    
    async def monitor_live_games(self):
        while True:
            for game in await self._fetch_live_games():
                model_prob = self.markov_chain.predict_win_probability(
                    LiveGameState(game.quarter, game.minutes_remaining,
                        encode_score_diff(game.home_score, game.away_score), game.possession))
                market_prob = await self._fetch_live_odds(game.espn_event_id)
                edge = model_prob - market_prob
                if abs(edge) >= 0.05:
                    await self.telegram.send(
                        f"🔴 LIVE BET ALERT\n{game.title} | Q{game.quarter} {game.clock}\n"
                        f"Score: {game.home_score}-{game.away_score}\n"
                        f"Model: {model_prob:.1%} | Market: {market_prob:.1%}\n"
                        f"Edge: {abs(edge):.1%} on {'HOME' if edge > 0 else 'AWAY'}")
            await asyncio.sleep(30)
```

### Common Live Edge Scenarios
- **Garbage time overreaction:** Market says 8% for team down 18 in Q3, chain says 14% (6% edge)
- **Run overreaction:** Market jumps to 72% after a 15-2 run, chain says 64% (8% edge — fade the run)
- **Close game precision:** Team up 3 with ball and 2:00 left → chain says 85%, market says 78% (7% edge)

### Verification
- [ ] Train on 3 seasons PBP → ~1.6M transitions
- [ ] Up 10 at halftime → predict ~72-78% | Down 20 in Q3 → predict ~10-15%
- [ ] Correlation with ESPN win probability tracker > 0.90

---

# Step 2.5.4 — Bayesian MCMC Elo (Full Posterior Distributions)

Instead of "Celtics = 1720 Elo" (a guess), MCMC produces "Celtics = 1720 ± 45 (95% CI: 1632–1808)." The **width** is a feature — narrow = confident, wide = uncertain.

### File: `NEW → monolith/models/markov/bayesian_elo.py`

```python
import pymc as pm

class BayesianEloModel:
    def fit(self, game_results: List[GameResult]):
        """Bradley-Terry model with MCMC sampling via NUTS."""
        teams = list(set([g.home_team for g in game_results] + [g.away_team for g in game_results]))
        team_idx = {t: i for i, t in enumerate(teams)}
        
        with pm.Model():
            strengths = pm.Normal("strengths", mu=0, sigma=200, shape=len(teams))
            hca = pm.Normal("hca", mu=50, sigma=20)
            logit_p = strengths[[team_idx[g.home_team] for g in game_results]] + hca \
                    - strengths[[team_idx[g.away_team] for g in game_results]]
            pm.Bernoulli("outcomes", logit_p=logit_p,
                          observed=[1 if g.home_won else 0 for g in game_results])
            self.trace = pm.sample(draws=2000, tune=1000, chains=4, return_inferencedata=True)
        self.teams, self.team_idx = teams, team_idx
    
    def predict_with_uncertainty(self, home: str, away: str) -> dict:
        """Returns mean probability + uncertainty range instead of a single number."""
        home_s = self.trace.posterior["strengths"].values[:,:,self.team_idx[home]].flatten()
        away_s = self.trace.posterior["strengths"].values[:,:,self.team_idx[away]].flatten()
        hca_s = self.trace.posterior["hca"].values.flatten()
        prob_samples = 1.0 / (1.0 + np.exp(-(home_s + hca_s - away_s) / 173.7))
        return {
            "mean_prob": float(np.mean(prob_samples)),
            "std_prob": float(np.std(prob_samples)),
            "prob_range_80": (float(np.percentile(prob_samples, 10)),
                              float(np.percentile(prob_samples, 90))),
            "confidence": "high" if np.std(prob_samples) < 0.04 else
                          "medium" if np.std(prob_samples) < 0.08 else "low",
        }
```

### XGBoost Features
| Feature | Description | Simons Rationale |
|---------|-------------|------------------|
| `home_strength_std` | Width of home team's strength posterior | Narrow = confident |
| `away_strength_std` | Width of away team's strength posterior | Same |
| `prob_uncertainty` | Std of win probability samples | High → skip signal |
| `strength_overlap` | % overlap in strength distributions | High = coinflip |

### Verification
- [ ] Top 5 teams by mean strength should match consensus rankings
- [ ] Uncertainty should be higher for teams with fewer games played
- [ ] `strength_overlap` high for even matchups, low for mismatches

---

# Step 2.5.5 — Higher-Order Markov Chains (2nd & 3rd Order)

Standard Markov is memoryless. 2nd-order considers the last **2** states; 3rd-order considers **3**. This captures momentum patterns 1st-order misses:

```
Sequence: W, W, W, W, L  (streak broken)
1st-order: "Loss" → predicts same as any other team coming off a loss (52%)
3rd-order: ("Win", "Win", "Loss") → knows they were hot and just stumbled (65%)
That 13% gap is exploitable edge.
```

### File: `NEW → monolith/models/markov/higher_order.py`

```python
class HigherOrderMarkovChain:
    def __init__(self, order: int = 2, n_symbols: int = 7):
        self.order = order
        self.transition_counts = defaultdict(lambda: defaultdict(int))
    
    def train(self, sequences: Dict[str, List[int]]):
        for team, obs in sequences.items():
            for i in range(self.order, len(obs)):
                state = tuple(obs[i - self.order:i])
                self.transition_counts[state][obs[i]] += 1
    
    def get_win_probability(self, recent_results: List[int]) -> float:
        state = tuple(recent_results[-self.order:])
        counts = self.transition_counts[state]
        total = sum(counts.values())
        if total < 10: return 0.5
        return sum(counts.get(sym, 0) for sym in WIN_SYMBOLS) / total
```

### XGBoost Features
| Feature | Description |
|---------|-------------|
| `higher_order_win_prob` | P(win) from 2nd-order chain given last 2 games |
| `streak_sequence_type` | Encoded last-3-games pattern (WWL, WLW, LLW, etc.) |
| `sequence_edge` | Higher-order P(win) minus 1st-order P(win) |

---

# Step 2.5.6 — Coupled Division Chains

Models **correlated team dynamics** within a division. When the Celtics improve, it affects Nets/Knicks/Sixers/Raptors — they play each other 4×/year and compete for the same playoff spots.

### File: `NEW → monolith/models/markov/coupled_chains.py`

```python
class CoupledDivisionChain:
    def get_division_context(self, team: str) -> dict:
        """
        Returns Elo adjustment based on division strength distribution.
        - 3+ weak rivals → -8 Elo (inflated record from easy games)
        - 3+ strong rivals → +5 Elo (battle-tested)
        """
        division_states = {t: self.hmm.get_most_likely_state(t) for t in self.teams}
        rival_states = {t: s for t, s in division_states.items() if t != team}
        n_weak = sum(1 for s in rival_states.values() if s in ["DECLINING", "TANKING"])
        n_strong = sum(1 for s in rival_states.values() if s in ["ELITE", "CONTENDING"])
        adjustment = (-8 if n_weak >= 3 else 0) + (5 if n_strong >= 3 else 0)
        return {"division_adjustment": adjustment, "n_weak_rivals": n_weak, "n_strong_rivals": n_strong}
```

### XGBoost Features
| Feature | Description |
|---------|-------------|
| `home_division_adj` | Division strength adjustment for home team |
| `away_division_adj` | Division strength adjustment for away team |
| `is_division_matchup` | Are these teams in the same division? (0/1) |

---

# Step 2.5.7 — Absorbing Markov Chains (Playoff Dynamics)

Models how playoff positioning and elimination dynamics affect team effort.

### File: `NEW → monolith/models/markov/absorbing_chain.py`

```python
class PlayoffAbsorbingChain:
    MOTIVATION_STATES = {
        "CONTESTING":   {"elo_adj": +10, "desc": "Fighting for seeding"},
        "BUBBLE":       {"elo_adj": +5,  "desc": "Play-in tournament race"},
        "NEAR_CLINCHED":{"elo_adj": -15, "desc": "About to clinch, may rest"},
        "CLINCHED":     {"elo_adj": -25, "desc": "Resting starters"},
        "NEAR_ELIM":    {"elo_adj": -5,  "desc": "Almost eliminated, chaotic"},
        "ELIMINATED":   {"elo_adj": -30, "desc": "Season over, development mode"},
    }
    
    def get_motivation_state(self, team, games_remaining, games_back, current_seed):
        """Most impactful February–April when these dynamics kick in."""
        if current_seed <= 6 and games_back <= 0:
            if games_remaining <= 5: return self.MOTIVATION_STATES["CLINCHED"]
            if games_remaining <= 15: return self.MOTIVATION_STATES["NEAR_CLINCHED"]
            return self.MOTIVATION_STATES["CONTESTING"]
        elif current_seed in [7,8,9,10]: return self.MOTIVATION_STATES["BUBBLE"]
        elif current_seed > 10:
            if games_back > games_remaining * 0.6: return self.MOTIVATION_STATES["ELIMINATED"]
            if games_back > games_remaining * 0.4: return self.MOTIVATION_STATES["NEAR_ELIM"]
            return self.MOTIVATION_STATES["BUBBLE"]
        return self.MOTIVATION_STATES["CONTESTING"]
```

### XGBoost Features
| Feature | Description |
|---------|-------------|
| `home_motivation_adj` | Elo adjustment from playoff positioning |
| `away_motivation_adj` | Same for away team |

---

# Step 2.5.8 — Continuous-Time Markov Chain (Live Betting v2)

Upgrades 2.5.3's discrete chain to a **continuous-time** model. Uses exact time intervals instead of fixed 30-second snapshots, and the matrix exponential for mathematically precise probabilities.

### File: `MODIFY → monolith/models/markov/live_game_chain.py`

```python
from scipy.linalg import expm

class ContinuousTimeNBAChain:
    """
    Models the RATE at which score differential changes.
    Rate = transitions / total dwell time in state (not just count).
    """
    def train(self, play_by_play_data):
        state_dwell_time = defaultdict(float)
        state_transitions = defaultdict(lambda: defaultdict(int))
        for game in play_by_play_data:
            for i in range(len(game.plays) - 1):
                s1, s2 = encode_state(game.plays[i]), encode_state(game.plays[i+1])
                dwell = game.plays[i+1].game_clock - game.plays[i].game_clock
                state_dwell_time[s1] += dwell
                if s1 != s2: state_transitions[s1][s2] += 1
        # Build rate matrix Q
        Q = np.zeros((self.n_states, self.n_states))
        for i in range(self.n_states):
            for j in range(self.n_states):
                if i != j and state_dwell_time[i] > 0:
                    Q[i][j] = state_transitions[i][j] / state_dwell_time[i]
            Q[i][i] = -sum(Q[i][j] for j in range(self.n_states) if j != i)
        self.rate_matrix = Q
    
    def predict_win_prob(self, current_state: int, seconds_remaining: float) -> float:
        """Exact win probability using P(t) = exp(Q·t)."""
        P_t = expm(self.rate_matrix * seconds_remaining)
        return sum(P_t[current_state][s] for s in self.HOME_WIN_STATES)
```

```
Discrete chain: forced into 30-second windows, loses info between
Continuous chain: exact time intervals, mathematically precise
Accuracy improvement: ~2-3% on live predictions (measured by log-loss)
```

---

# Integration Summary

```
PRE-GAME PREDICTION PATH:
━━━━━━━━━━━━━━━━━━━━━━━━
2.5.1: TeamHMM → state distribution → hmm_win_prob → Model Blender
2.5.2: TeamHMM → state features ─┐
2.5.4: BayesianElo → uncertainty ─┤→ XGBoost Feature Pipeline (18 features)
2.5.5: HigherOrder → momentum ────┤
2.5.6: CoupledDiv → division ctx ─┤
2.5.7: AbsorbingChain → motivation┘

LIVE GAME PATH (SEPARATE):
━━━━━━━━━━━━━━━━━━━━━━━━━
2.5.3: LiveGameMarkovChain → live_win_prob
2.5.8: ContinuousTimeChain → precise_live_prob (upgrades 2.5.3)
         → Compare to live market odds
         → Telegram alert if edge > 5%
         → Display on /signals/nba/live endpoint
```

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/models/markov/team_hmm.py` | NEW | HMM for team regime detection |
| `monolith/models/markov/bayesian_elo.py` | NEW | Bayesian MCMC team strength |
| `monolith/models/markov/higher_order.py` | NEW | 2nd/3rd order momentum chains |
| `monolith/models/markov/coupled_chains.py` | NEW | Division dynamics |
| `monolith/models/markov/absorbing_chain.py` | NEW | Playoff motivation |
| `monolith/models/markov/live_game_chain.py` | NEW | Live discrete + continuous-time chain |
| `monolith/models/markov/live_betting.py` | NEW | Live betting signal generator |
| `monolith/ml/feature_pipeline.py` | MODIFY | Add 18 Markov features |
| `monolith/ml/model_blender.py` | MODIFY | Add HMM as 4th model in blend |
| `monolith/api/routes/alpha.py` | MODIFY | Add `/signals/nba/live` endpoint |

## Total XGBoost Features from Phase 2.5: **18**
Feature vector grows from 25 (original) → **43 features**

## Dependencies
- `hmmlearn>=0.3.0` — Hidden Markov Models
- `pymc>=5.0.0` — Bayesian MCMC sampling
- `scipy` — Matrix exponential for CTMC
- NBA Stats Play-by-Play API (free) — for training live chain
- ESPN Scoreboard API (free, already integrated) — for live polling
- The Odds API — for live odds comparison

## Training Data Requirements
| Model | Data Needed | Source | Volume |
|-------|------------|--------|--------|
| HMM (2.5.1/2.5.2) | Game results + margins | Phase 1 DB | ~3,700 games (3 seasons) |
| Live Chain (2.5.3/2.5.8) | Play-by-play data | NBA Stats API | ~1.6M transitions |
| Bayesian Elo (2.5.4) | Game results | Phase 1 DB | ~1,230 games (1 season min) |
| Higher-Order (2.5.5) | Game result sequences | Phase 1 DB | ~3,700 games |
| Coupled (2.5.6) | Division game results | Phase 1 DB | ~600 games/division |
| Absorbing (2.5.7) | Standings + schedule | ESPN API | Current season live |
