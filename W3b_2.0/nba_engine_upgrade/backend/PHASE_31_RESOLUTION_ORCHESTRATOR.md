# Phase 31: Game Resolution Engine (The Midnight Review)

Quantitative Funds do not improve if they do not learn from the future. The `resolution_orchestrator.py` script is the vital counterpart to the Signal Orchestrator. When all games finish on the West Coast, the Machine must wake up, ingest the box scores, and adjust its priors.

## Objective
To strictly decouple "Prediction" from "Resolution." This cron job fires at exactly 1:00 AM Eastern Time to permanently update the PostgreSQL database.

## Implementation Details

### 1. The Post-Game Memory Cycle
The Engine must undergo three specific loops:
- **Phase 1 (Elo Delta):** Did the Knicks actually win by 10 points? The engine pulls from ESPN, recalculates the Elo ratings, and adjusts the K-Factor for tomorrow.
- **Phase 5 (CLV Tracker):** The #1 metric in Sports Betting. Did our 6:00 PM bet physically beat the 7:00 PM Closing Line? The engine pulls the final Tip-Off odds and writes the `clv_cents` gap to memory.
- **Phase 26 (Dalio Grades):** The `post_mortem.py` script matches the Box Score against the Pre-game signals. It forcefully tags the algorithm: `SKILLED`, `GOOD LUCK`, `BAD LUCK`, or `MISTAKE`.

### 2. Feature Extractor Re-Training
The XGBoost memory pipeline relies on pristine normalized feature matrices. The Midnight script must commit today's 10 games into the `nba_features` database with exactly matched target outcomes (`Result` and `Margin of Victory`) so the Model can train over them next Monday.

## Verification
- Run a `--force-resolve` command on a mock game (e.g., Boston loses by 5). Prove that Elo drops, CLV is written, and Dalio tags it as a `BAD LUCK` or `MISTAKE` based on the pre-game matrix.
