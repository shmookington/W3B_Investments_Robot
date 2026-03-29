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

*"The smartest money is silent."*
