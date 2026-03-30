# Phase 13: Reinforcement Learning & Optimal Execution
### *Adaptive Bet Sizing, Timing Optimization, and Multi-Game Portfolio Allocation*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech used RL to optimize *when* and *how much* to trade — not just *what* to trade. Their execution layer extracted millions in additional alpha. We do the same for bet placement.
> **Priority:** 🟡 High | **Estimated Effort:** 5-7 days | **Impact:** Optimal bet sizing + timing = 10-15% more profit from same signals

---

## Overview

Having a great prediction engine is only half the battle. The other half is **execution** — when to place the bet, how much to bet, and how to allocate across multiple simultaneous games. RenTech's execution algorithms were responsible for a significant portion of their returns. A signal that generates 5% edge becomes 8% edge with optimal execution.

---

## Step 13.1 — Deep Q-Network (DQN) for Bet Timing

### File: `NEW → monolith/models/rl/bet_timer.py`

```python
import torch
import torch.nn as nn

class BetTimingDQN(nn.Module):
    """
    Learns the optimal TIME to place a bet on a given game.
    
    The line moves throughout the day. Place too early and you might
    get a worse line that improves later. Place too late and the edge
    may have disappeared. The DQN learns the optimal placement window.
    
    State: [hours_to_tip, current_edge, line_movement_velocity,
            public_bet_pct, injury_report_status, day_of_week]
    Actions: [BET_NOW, WAIT_30MIN, WAIT_1HR, WAIT_2HR, SKIP]
    Reward: CLV achieved (our line vs closing line)
    """
    
    def __init__(self, state_dim=12, n_actions=5):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(state_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, n_actions),
        )
    
    def get_state(self, game_context: dict) -> torch.Tensor:
        return torch.tensor([
            game_context["hours_to_tip"],
            game_context["current_edge"],
            game_context["line_movement_rate"],       # points/hour
            game_context["public_bet_pct"],
            game_context["injury_report_released"],   # 0 or 1
            game_context["n_books_with_line"],
            game_context["spread_variance_across_books"],
            game_context["is_primetime"],
            game_context["day_of_week"],
            game_context["sharp_action_detected"],
            game_context["steam_move_active"],
            game_context["model_confidence"],
        ], dtype=torch.float32)
    
    def select_action(self, state, epsilon=0.1):
        if random.random() < epsilon:
            return random.randint(0, 4)  # Explore
        with torch.no_grad():
            return self.network(state).argmax().item()
```

### Training Data
```python
# Replay buffer built from historical line movement data:
# For each game we had a signal on, we record:
# - What line was available at each 30-min interval before tip
# - What the closing line was
# - Our CLV if we had bet at each interval
# 
# The DQN learns: "When line movement velocity is -0.3 pts/hr and
# our edge is 4%, wait 2 hours because the line will move further
# in our direction 65% of the time"
```

---

## Step 13.2 — Multi-Armed Bandit for Signal Selection

### File: `NEW → monolith/models/rl/signal_selector.py`

```python
class ThompsonBanditSignalSelector:
    """
    On any given night, we might have 6 games with positive edge.
    Bankroll is limited. Which signals deserve capital?
    
    Thompson Sampling maintains a Beta distribution for each signal
    type's true hit rate and samples from posteriors to decide.
    
    Arms (signal types):
    - High edge (>8%), high confidence
    - Medium edge (5-8%), high confidence
    - High edge, medium confidence
    - Medium edge, medium confidence
    - Live game signals
    - Regime transition signals (Phase 2.5.2)
    """
    
    def __init__(self):
        # Beta(alpha, beta) prior for each signal type
        self.arms = {
            "high_edge_high_conf": {"alpha": 1, "beta": 1},
            "med_edge_high_conf":  {"alpha": 1, "beta": 1},
            "high_edge_med_conf":  {"alpha": 1, "beta": 1},
            "med_edge_med_conf":   {"alpha": 1, "beta": 1},
            "live_signal":         {"alpha": 1, "beta": 1},
            "regime_transition":   {"alpha": 1, "beta": 1},
        }
    
    def rank_signals(self, tonight_signals: List[Signal]) -> List[Signal]:
        """
        Rank tonight's signals by expected value using Thompson Sampling.
        Allocate capital to the top-ranked signals first.
        """
        scored = []
        for signal in tonight_signals:
            arm = self._classify_signal(signal)
            # Sample from posterior
            sampled_hit_rate = np.random.beta(
                self.arms[arm]["alpha"], self.arms[arm]["beta"]
            )
            expected_value = sampled_hit_rate * signal.edge * signal.decimal_odds
            scored.append((signal, expected_value))
        
        return [s for s, _ in sorted(scored, key=lambda x: -x[1])]
    
    def update(self, signal_type: str, won: bool):
        """Update posterior after observing outcome."""
        if won:
            self.arms[signal_type]["alpha"] += 1
        else:
            self.arms[signal_type]["beta"] += 1
```

---

## Step 13.3 — Proximal Policy Optimization (PPO) for Bankroll Management

### File: `NEW → monolith/models/rl/bankroll_ppo.py`

```python
class BankrollPPO:
    """
    Dynamic bankroll allocation that adapts to current performance.
    
    Static Kelly says "bet 3% of bankroll" regardless of context.
    PPO learns context-dependent sizing:
    
    - During a drawdown → reduce sizing to survive
    - During a hot streak → maintain sizing (don't get overconfident)
    - Near a stop-loss threshold → dramatically reduce
    - When model is freshly retrained and uncalibrated → reduce
    - When multiple correlated games hit → reduce per-game allocation
    
    State: [bankroll, drawdown_pct, recent_win_rate, n_active_bets,
            model_last_retrained_days, avg_recent_clv, current_streak]
    Action: kelly_fraction_multiplier (0.0 to 1.0)
    Reward: log(bankroll_t+1 / bankroll_t)  (log wealth growth)
    """
    
    def get_sizing_multiplier(self, context: dict) -> float:
        """
        Returns a multiplier [0.0 - 1.0] to apply to the base Kelly size.
        
        0.0 = sit out entirely
        0.5 = half-Kelly (conservative period)
        1.0 = full recommended Kelly
        """
```

---

## XGBoost Features from Phase 13
| Feature | Description |
|---------|-------------|
| `optimal_bet_timing` | DQN's recommended action (bet now vs wait) |
| `signal_rank` | Thompson Sampling rank among tonight's signals |
| `kelly_multiplier` | PPO's recommended sizing multiplier |

## Dependencies
- `torch` (PyTorch for DQN and PPO)
- Historical line movement data (from Phase 5)
- Signal outcome history (from Phase 7 backtest)
