# Ops Tab 5: SPORTS (Asset Classes)

## The Objective
This is the central hub for monitoring the real-world underlying assets (NBA, NFL, NHL). It monitors the pipelines that feed the specific sports data engines.

## Visual Implementation Plan
1. **Pipeline Health per Sport:**
   - Status indicators for specific API endpoints (e.g., NBA Stats API: `[SYNCED 4m ago]`, NFL Weather API: `[WARN - PENDING]`).
2. **The Active Slate:**
   - A dense, sortable view of all active and upcoming real-world events that the engine is currently pricing.
   - E.g., A list of all 8 NBA games tonight and exactly how many internal projections have been generated for them so far.
3. **Confidence Degradation:**
   - Alerts flagging if the engine is struggling to price a sport due to missing injury data or abrupt lineup changes.
