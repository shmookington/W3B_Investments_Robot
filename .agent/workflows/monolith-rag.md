---
description: MANDATORY - Load MONOLITH knowledge context at the START of every conversation
---

# MONOLITH RAG — Mandatory Context Loading

> **THIS IS NOT OPTIONAL.** Every conversation that involves the MONOLITH project,
> W3B, trading, strategies, research, checklists, or ANY related topic MUST begin
> by loading context from the RAG system. This makes you a better, more precise assistant.

> **🏈 KEY CONTEXT (as of March 2026):**
> - MONOLITH is a **quantitative sports prediction engine**, NOT a multi-asset financial trading bot.
> - We trade **CFTC-regulated event contracts on Kalshi** (sports: soccer, NBA, CFB, NFL).
> - Models: **Dixon-Coles** (soccer), **xG**, **SP+/EPA** (football), **Four Factors** (NBA).
> - The $SRC governance token is **deferred** (Option C — built, not launched).
> - DeFi features (lending, synthetics) are **built but deferred**.
> - The **3-pillar architecture**: Vault (deposits) → Prediction Engine (MONOLITH) → Track Record (on-chain).
> - The CRT/Space Odyssey **terminal aesthetic is sacred**.
> - Execution: **Oracle Mode** — MONOLITH recommends, operator manually places on Kalshi.

## STEP 1: Load Context (DO THIS FIRST, BEFORE ANYTHING ELSE)

// turbo
Run the RAG preloader to populate your brain with relevant context:
```bash
cd /Users/amiritate/EARN/W3B/monolith_rag && ./venv/bin/python preload.py 2>&1 | tail -5
```

## STEP 2: Read the Context File

Read the generated context file in your current brain directory. It contains the most important information from all MONOLITH documents.

## STEP 3: If the user asks about a SPECIFIC topic, run a targeted query

// turbo
```bash
cd /Users/amiritate/EARN/W3B/monolith_rag && ./venv/bin/python query.py "USER'S SPECIFIC TOPIC" --brain --top 10 2>&1 | tail -5
```

Then read the updated `monolith_rag_context.md` in your brain directory for precise answers.

## STEP 4: When you write NEW research docs or modify existing ones

The file watcher is running in the background and will auto-reindex. No action needed.
If the watcher is not running:
// turbo
```bash
cd /Users/amiritate/EARN/W3B/monolith_rag && ./venv/bin/python watcher.py --daemon
```

## WHY THIS MATTERS
Without RAG: You guess from summaries and vague memory. You miss formulas, file paths, and connections.
With RAG: You have exact paragraphs, exact code blocks, exact architecture decisions from 59+ documents (2,231+ chunks) instantly available. You are a MONOLITH specialist, not a generalist.
