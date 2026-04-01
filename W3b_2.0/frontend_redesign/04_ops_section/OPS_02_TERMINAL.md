# Ops Tab 2: ◆ TERMINAL

## The Objective
A direct, CLI-like interface built into the Next.js frontend. This is for manual overrides, direct state mutations, and raw database querying without needing to SSH into the Hetzner VPS.

## Visual Implementation Plan
1. **The Interface:**
   - Pure black background with Fira Code/JetBrains Mono text.
   - Mimics a standard Unix terminal environment.
2. **Built-in Commands:**
   - Pre-fills with custom MONOLITH commands (e.g., `/force-resolve [event_id]`, `/suspend-execution`, `/sync-kalshi`).
3. **WebSocket Streaming:**
   - The terminal should hook directly to a raw WebSocket feed of the Python backend's `stdout` so the operator can watch the engine "think" in real-time.
