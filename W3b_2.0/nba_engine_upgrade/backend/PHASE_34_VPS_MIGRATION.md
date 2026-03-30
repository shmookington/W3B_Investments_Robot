# Phase 34: The VPS Code Migration (Environment Sync)

The Intelligence Engine physically exists on your Mac (`/Users/amiritate/EARN/W3B/monolith`). A Hedge Fund must operate 24/7 on an un-interruptable network. This phase securely migrates the exact codebase state up into the Cloud environment (Hetzner Linux VPS).

## Objective
To successfully upload the `monolith` repository via RSA SSH transfer, and clone the identical Python `.venv` environment so that XGBoost, HMM, and the Orchestrators execute identically on the Linux architecture as they do on the Apple architecture.

## Implementation Details

### 1. Secure Shell (SSH) Protocol
1. **Connection:** Utilize your local `~/.ssh/monolith_vps` private RSA key.
2. **Transfer Bridge:** Execute an `rsync -avz --exclude` command prioritizing the `monolith/` directory. We explicitly block transferring the local Mac `.venv` folder, `.git`, `__pycache__`, and any localized Mac environment `.env` files.

### 2. The Linux Virtual Environment
1. SSH into the Hetzner terminal: `ssh -i ~/.ssh/monolith_vps root@XXX.XXX.XXX...`
2. Initialize root directory `/var/w3b_engine/monolith`.
3. Construct the clean Linux virtual machine (`python3 -m venv .venv`).
4. Execute `pip install -r requirements.txt`. This strictly enforces versions on critical machine learning matrices (`xgboost`, `pandas`, `scipy`) preventing dependency drift.

## Verification
- SSH into the Hetzner box. Type `python monolith/pipeline/signal_orchestrator.py --dry-run`. If the script initializes without throwing a `ModuleNotFoundError`, we have perfectly translated the local codebase to the global server.
