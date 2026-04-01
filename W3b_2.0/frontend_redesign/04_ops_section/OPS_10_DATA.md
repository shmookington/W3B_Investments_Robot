# Ops Tab 10: DATA

## The Objective
The Engine starves without it. This tab monitors the massive ingress of external data (scrapers, APIs, historical downloads) and internal database health (PostgreSQL / Redis).

## Visual Implementation Plan
1. **Pipeline Architecture Flowchart:**
   - A literal roadmap of current data ingestion: `[ESPN API] -> [Redis Cache] -> [Normalization] -> [Postgres]`. Each node lights up green or red based on its health status.
2. **Ingestion Volume Metrics:**
   - A rolling graph showing how many gigabytes of event data, player stats, and market lines have been ingested in the last 24 hours.
3. **Resolution Orchestrator Queue:**
   - A list of all historical events currently trapped in the "Pending Resolution" state, waiting for the consensus APIs to declare a final score or result.
