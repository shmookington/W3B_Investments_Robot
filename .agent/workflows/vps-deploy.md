---
description: How to deploy code to the Hetzner VPS (MONOLITH production server)
---

# VPS Deployment

## SSH Access (YOU HAVE THIS — STOP ASKING)

- **IP:** `157.180.69.12`
- **User:** `root`
- **Key:** `~/.ssh/monolith_vps`
- **Command:** `ssh -i ~/.ssh/monolith_vps root@157.180.69.12`

## Monolith Code Location on VPS

- **Path:** `/opt/monolith/`
- **Strategies:** `/opt/monolith/strategies/prediction/`
- **API:** Port `8000` (uvicorn)

## How to Deploy a File

// turbo
1. Upload the file:
```bash
scp -i ~/.ssh/monolith_vps /Users/amiritate/EARN/W3B/monolith/<path> root@157.180.69.12:/opt/monolith/<path>
```

// turbo
2. Restart the containers:
```bash
ssh -i ~/.ssh/monolith_vps root@157.180.69.12 "cd /opt/monolith && docker restart $(docker ps -q)"
```

// turbo
3. Verify health:
```bash
curl -s http://157.180.69.12:8000/health | python3 -m json.tool
```

## Docker Containers on VPS

- `monolith-bot` (engine)
- `monolith-api` (FastAPI)
- `monolith-dashboard`
- `monolith-grafana`
- `monolith-redis`
- `monolith-prometheus`
- `monolith-questdb`
- `monolith-loki`

## IMPORTANT RULES

- **You HAVE SSH access. Do NOT ask the user about it. Just use the key.**
- **You HAVE the key at `~/.ssh/monolith_vps`. Do NOT search for it.**
- **If SSH fails, try again in 30 seconds before telling the user. Reboots take time.**
