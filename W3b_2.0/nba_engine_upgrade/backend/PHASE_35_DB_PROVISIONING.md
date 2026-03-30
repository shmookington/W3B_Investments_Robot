# Phase 35: PostgreSQL Database & Server Memory Provisioning

An Intelligence engine completely dies without a physical memory matrix. Right now, your local Mac was simulating SQL logic in memory variables. The Production Hetzner server must possess genuine, persistent PostgreSQL sectors so the `W3b ML` can cross-reference years of data flawlessly. 

## Objective
To SSH root-execute the Master Data Migration scripts, physically spinning up the `nba_features`, `decision_journal`, `w3b_capital`, and `nba_game_results` tables. The server's memory will be 100% structured for the Engine to start writing to.

## Implementation Details

### 1. The PostgreSQL Architecture 
1. **Engine Setup:** Install `postgresql` and `postgresql-contrib` onto your Ubuntu Linux distribution via SSH. 
2. **Access Control:** Formally securely configure your PostgreSQL superuser password and whitelist local sockets to prevent external hacks into your edge variables.
3. **Database Spin-up:** Route the `monolith/db/migrations/001_engine_upgrade.sql` query directly into a `w3b_master_matrix` database instance.

### 2. The `.env` Security Protocol
Before the orchestrated Python scripts can execute anything, they require the Secret variables.
1. SSH into `/var/w3b_engine/monolith/.env.production`.
2. Securely paste the physical `.env` payload holding the Kalshi RSA Executable hashes, the Odds API, and ESPN tokens.

## Verification
- We run a Python test `psycopg2` verification directly on the Linux machine. We pull the `decision_journal` index. If it outputs `Table Exists - 0 Rows`, it means our Engine has a pristine, working brain memory bank ready for its first execution at 10 AM.
