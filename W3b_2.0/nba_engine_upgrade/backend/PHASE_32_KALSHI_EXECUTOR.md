# Phase 32: The Execution Ledger (Kalshi Exchange API)

We stated explicitly that the Engine will transact exclusively on Kalshi. To physically "Buy" a Contract, the Orchestrator MUST submit identical geometric cryptograph structures (Elliptic Curve Digital Signatures / ECDSA) mapping our Private Key against the trade execution block.

## Objective
The `kalshi_executor.py` script acts as the literal connection matrix to the exchange, dynamically hashing the `POST /orders` REST endpoint.

## Implementation Details

### 1. The Cryptographic Base
1. The script must securely import our Private RSA/ECDSA key from the `.env` / secret manager.
2. It must intercept the orchestrator's `[EXECUTION]` payload.
3. It must encode the exact HTTP Request path (`POST /trade/orders`), query string, and the milliseconds epoch timestamp into a singular string blob.
4. It must sign that payload. 
5. It must parse the base64 output into the `Kalshi-Access-Signature` Header.

### 2. The Order Router
1. The Engine decides to risk 5% Kelly Fraction on `NBA-BOS-20250325` (Boston Celtics).
2. The Executor parses Kalshi's string IDs, queries their explicit exchange endpoint `GET /markets/NBA-BOS-...", fetches the exact spread/yes-no limit price.
3. If Kalshi's price aligns with the XGBoost limit → Submit `Buy` Limit Order.
4. If Kalshi's price is heavily compressed (edge vanishes) → Post a Maker Order below Ask and wait 60 seconds.

## Verification
- We MUST construct a Master Integration simulating a `Buy 1 Contract at 50 Cents` action on Kalshi using the Cryptographic Hashing signature. Ensure the Kalshi environment returns `HTTP 201 Created` internally or via their Paper-Trading endpoint.
