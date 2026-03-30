# Phase 30: Signal Pipeline Orchestrator (The True Brain)

Phases 1 through 29 built world-class quantitative modules. Phase 30 ties them all together into a unified operational script that physically runs the Hedge Fund.

## Objective
The `signal_orchestrator.py` script acts as the master loop. Instead of manually running `injury_tracker.py` then running `xgboost.py`, the Orchestrator runs sequentially through all active intelligence nodes to output exactly ONE structure: `The Daily Kelly Execution JSON`.

## Implementation Details

### 1. The Sequential Waterfall
The orchestrator must strictly follow this physical order:
1. **Core:** `Phase 1 (Elo)` → `Phase 2 (Injuries)`
2. **Context:** `Phase 3 (Lineups)` → `Phase 4 (H2H)`
3. **Market:** `Phase 5 (Live Odds)` → `Phase 10 (Stat Arb)`
4. **Machine Learning:** `Phase 17 (XGBoost)` → `Phase 21 (Meta Stack)`
5. **Legendary:** `Phase 27 (Dalio)` → `Phase 28 (Factors)` → `Phase 29 (Soros)`
6. **Execution/Risk:** `Phase 22 (RL Timer)` → `Phase 24 (Kelly Portfolio)`

If any script fails (e.g., ESPN API is down during Phase 1), the Orchestrator must employ **Graceful Degradation** (using cached memory) rather than crashing the fund.

### 2. Configurable Enable Flags
Not every phase needs to be active on Day 1. The Orchestrator will read from a `config.yaml` file so the User can dynamically pause/resume individual models (e.g., turning off the 'Soros' engine if it needs retuning) without editing code.

## Verification
- Run a `--dry-run` simulation of the pipeline for today's NBA slate. Ensure the orchestrator flawlessly pulls from all 29 scripts and outputs a final, validated `{edge: X, confidence: Y, allocation: Z}` JSON object.
