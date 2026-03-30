# W3B Quantitative Investments Engine 🤖🎰
### *Market Omniscience Network — Operational Liquidity Intelligence & Treasury Hyperengine (MONOLITH)*

> **Note:** The core algorithmic mathematics, quantitative calculator models, and data pipelines for this repository have been intentionally **kept private (.gitignored)** to protect proprietary intellectual property and trading edges. This repository showcases the architectural scaffolding and systems infrastructure.

---

## Overview
**W3B Investments** is an autonomous, high-frequency quantitative advisory engine built to extract reliable mathematical alpha from highly liquid sports prediction markets (Kalshi, DraftKings). 

Operating autonomously on a custom-built infrastructure, the engine bypasses human emotional variance by aggregating thousands of data points asynchronously, parsing them through an advanced Elo and Markov-Chain processor, and detecting market inefficiencies (Closing Line Value discrepancies) before tip-off.

### 🧠 The Intelligence Layer
The engine evaluates games not by watching them, but by decoding them mathematically:
- **Dynamic Elo Grids**: Uses advanced Margin of Victory (MOV) tracking, K-Factor volatility shifts, and custom Home Court Advantage mappings (Denver Altitudes vs Standard).
- **Markov Chain Regime Detection**: Analyzes schedule density (Back-to-Backs, 3-IN-4s), fatigue vectors, and roster momentum states to categorize games into specific betting regimes.
- **Micro-Player Analytics**: Connects directly to NBA databases to map precise Box Plus/Minus and Usage Rate differentials. If a major player is a late-scratch 30 minutes before tipoff, the engine accurately drops the exact Elo value of the team rather than relying on standard deviation estimates.
- **Psychological Models**: Mathematically maps Letdown Spots, Trap Games, Revenge Skews, and 5+ Road Trip Fatigue trajectories, capping emotional swings at ±25 Elo points.

### 📈 Market Espionage
The system is built to track the "Sharp Money" moving through Las Vegas.
- **Keyless Oracle Hooks**: Bypasses traditional paid market APIs by silently harvesting DraftKings lines natively from embedded JSON scoreboards.
- **Reverse Line Movement (RLM)**: Detects when 85% of retail money hits one team, but the Vegas algorithm moves the spread toward the opposite team (indicating heavy professional Syndicate action).
- **Steam Alerts**: Detects sudden coordinated 1.5+ point spread swings across 3+ sportsbooks within a 10-minute window, alerting the advisory board immediately.
- **Closing Line Value (CLV)**: Autonomously strips the Vegas "Vig" off the board and audits every generated ticket against to the final tip-off odds. 

### ⚙️ Production Architecture
- **Web3 Interface:** Built using Next.js with deep visual shaders designed to emulate modern holographic trading environments.
- **Auto-Generating Memory:** Operates cleanly with multiple autonomous SQLite instances (`h2h_records.db`, `market_odds.db`, `player_stats.db`) spun up dynamically in memory to store multi-year rivalry matchups and line-movement histories.
- **Advisory Node:** Computes fractional Kelly Criterion sizing for active capital allocation while guarding bankrolls behind strict 15% daily drawdown limits.

---

## The 36-Phase Quantitative Architecture
The Engine was constructed in 9 systematic sprints, each adding a progressive layer of institutional mathematical rigor:

### Sprint 1: Foundation
1. **Data Quality Pipeline:** Sanitizes names and cross-references API mismatches to prevent database corruption.
2. **Dynamic Elo System:** Translates exact Margin of Victory (MOV) into continuous rolling team strength.
3. **Live Context Feeds:** Modifies odds natively based on ESPN Injury reports and Back-to-Back fatigue scaling.
4. **Markov Regimes:** Classifies game states into 8 mathematical HMM nodes (Garbage Time, Clutch Time, etc).

### Sprint 2: Prove It
5. **Backtesting Framework:** Performs Walk-Forward Analysis to test historical ROIs across past NBA seasons.
6. **Model Decay Detection:** Identifies when statistical patterns break down, forcing the AI to self-correct.
7. **Native API Router:** Pipes backend intelligence dynamically into the Vercel Frontend matrix.

### Sprint 3: Intelligence Layer
8. **Player-Level Stats:** Weighs Box-Plus-Minus vectors for Lineup modeling (What happens when a star sits?).
9. **H2H & Situational Adjustments:** Mathematically adjusts for revenge games, high altitude (Denver), and schedule traps.
10. **Market Intelligence:** Detects "Steam" (massive line movement) indicating syndicate or institutional involvement.
11. **Alternative Data:** Evaluates Referee assignments and Free-Throw-Attempt discrepancies.

### Sprint 4: Advanced Quant Layer
12. **Signal Processing:** Uses Fourier transformers to detect cyclic betting patterns.
13. **NLP & Sentiment:** Scrapes Twitter to grade injury leaks before Vegas lines adjust.
14. **Statistical Arbitrage:** Locates cross-market discrepancies.
15. **Bayesian Inference:** Applies probabilistic updating mapping true uncertainty.
16. **Graph Analysis:** Analyzes the NBA roster connectivity network.

### Sprint 5: Machine Learning
17. **XGBoost Feature Pipeline:** Aggregates all variables into a multi-dimensional predictive modeling algorithm.
18. **Meta-Learning (Stacking):** Blends multiple disparate outputs into a singular master confidence score.
19. **Information Theory:** Maps exactly how much each variable contributes to preventing entropy.
20. **Monte Carlo Simulation:** Simulates the season 10,000+ times to map True Probability.

### Sprint 6: Mastery
21. **Causal Inference:** Separates correlation (noise) from actual mathematical causation.
22. **Reinforcement Learning:** Teaches the engine the optimal time of day to logically enter the market.
23. **Kalshi Advisory Sync:** Natively polls Kalshi to verify Bankroll stability and track live active contracts.
24. **Portfolio Theory:** Adjusts risk correlation if the AI is betting multiple games on the same slate.
25. **Adversarial Robustness:** Stress tests the model explicitly searching for hidden blind spots and overfit vectors.

### Sprint 7: Legendary Insights
26. **Transfer Learning:** Porting neural patterns across sports lines.
27. **Decision Journal (Ray Dalio):** Automatically grades every trade via Post-Mortem quadrant analysis (Skill vs Luck).
28. **Factor Investing (Cliff Asness):** Ranks NBA teams against Fama-French structural concepts (Momentum/Value).
29. **Reflexivity (George Soros):** Maps and dynamically fades illogical public perception gaps (market hype bubbles).

### Sprint 8: Execution & Orchestration
30. **Signal Pipeline Orchestrator:** The Master Waterfall loop. Connects all modules into a single synchronized prediction.
31. **Game Resolution Engine:** Wakes up at 1:00 AM nightly to fetch box scores, update Elo, and calculate CLV.
32. **Kalshi Execution Protocol:** Automatically generates base64 Elliptic Curve Digital Signatures (ECDSA) to physically place limit orders.
33. **W3b API Router:** Constructs the blazingly fast FastAPI bridge so the Web GUI can read the AI's pulse.

### Sprint 9: Production DevOps
34. **VPS Linux Migration:** Physically pushes the architecture off the local Mac and into the autonomous Hetzner Cloud.
35. **Database Initialization:** Spins up the encrypted PostgreSQL server, permanently archiving the Engine's memory matrices.
36. **Persistent Crontab Orchestration:** Embeds the Execution algorithms into the Linux OS preventing the need for manual triggering.

---

*"The smartest money is silent."*
