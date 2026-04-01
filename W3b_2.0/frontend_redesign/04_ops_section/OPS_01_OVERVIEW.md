# Ops Tab 1: OVERVIEW (The Master Control)

## The Objective
This is the root of the operations section. It is the immediate health-check of the entire MONOLITH engine stack. It must prioritize extreme data density over marketing fluff.

## Visual Implementation Plan
1. **System Health Matrix:**
   - 8-grid layout showing the heartbeat (`[OK]`, `[WARN]`, `[FAIL]`) of all core docker containers (Data Ingestion, Resolution, Postgres, Redis).
   - Real-time latency graph showing API response times from Kalshi/DraftKings/Pinnacle.
2. **Current Macro State:**
   - Displays the active `REGIME` (e.g., "High Volatility - Defensive Sizing").
   - Shows total active capital exposure.
3. **Command Feed (The Stream):**
   - A raw, scrolling log window at the bottom of the screen showing the 10 most recent actions taken by the Engine (e.g., `[INFO] Wrote 142 records to nba_player_props`, `[EXEC] Sourced 500 capital into LAL/DEN Q3`).
