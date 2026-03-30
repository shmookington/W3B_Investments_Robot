# Phase 36: Persistent Automation (Crontab Engineering)

Right now, the Python AI Orchestrators (`signal_orchestrator.py`, `resolution_orchestrator.py`) only trigger if a human manually executes them. A hedge fund must sleep. Phase 36 removes the Human element by wiring the AI directly into the Linux Operating System's nervous system.

## Objective
To strictly map the exact Phase execution logic into the Hetzner OS `crontab -e`. The Linux Kernel will physically force the Python engine to boot up, run, and self-terminate at the explicit algorithmic times. No manual `python run.py` commands will ever be needed again.

## Implementation Details

### 1. The Real-Time Scheduler
The Linux Terminal will run `crontab -e` injecting these permanent operations:

- **10:00 AM Daily:** `00 10 * * * /usr/bin/python3 /var/w3b_engine/monolith/pipeline/signal_orchestrator.py >> /var/log/monolith/engine.log 2>&1`
- **1:00 AM Daily:** `00 01 * * * /usr/bin/python3 /var/w3b_engine/monolith/pipeline/resolution_orchestrator.py >> /var/log/monolith/resolution.log 2>&1`
- **4:00 AM Monday:** `00 04 * * 1` - Weekly XGBoost Neural Network Retraining.

### 2. Log Archiving & Alert Failsafes
The AI's `print()` statements must be safely exported to standard Linux log directories `var/log/monolith`. If an API breaks while you are asleep, you must be able to securely scroll through the history log to read exactly what happened at 10 AM. We will configure standard `.log` rotation so the files do not overwhelm the server's hard drive space.

## Verification
- We run a mock cron assignment for exactly 1 minute from the Server Time. 
- If the `/log/` instantly outputs a successful `Phase 30 Orchestrator Execution JSON` independently and without any human intervention... **The AI is fully autonomous.**
