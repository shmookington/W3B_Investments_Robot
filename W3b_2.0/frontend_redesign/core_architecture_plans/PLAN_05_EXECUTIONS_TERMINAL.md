# Frontend Redesign Phase 5: Live Terminal & Active Execution

**Status:** APPROVED
**Topic:** The Active Execution Environment (`/terminal`)

## 1. The Strategy: The Trading Engine UI
This is where the user watches W3B actively find and execute statistical arbitrage. It is the core visualizer of the backend Python engines (Alpha, Regime, Risk) operating in real-time on WebSockets.

### Core Redesign Tenets:
1. **The Pulse of the Market:** We need constant, real-time scrolling logs and flashing data points simulating the intake of thousands of probability variables (the ones we built in `results_collector.py` and `markov.py`).
2. **"Volatility Matrix" Visualizer:** Remove the basic tabular views and implement an advanced D3.js or high-performance Canvas element plotting current live probabilities vs target Kelly-criterion sizing.
3. **Typography:** This route is 95% `<JetBrains>` monospace since it's displaying live execution data.

## 2. Component Structure Breakdown

**1. `<OrderBookDepth>`**
- To truly feel like a hedge fund, the terminal must visualize the Bid/Ask spread of target event shares (e.g. Kalshi contracts). 
- Bid volume is shaded dark cyan, Ask volume shaded muted dark gold.

**2. `<ExecutionTape>` (Right Sidebar)**
- A rolling ticker of actions the Monolith Engine is taking:
  `[09:41:03] ACQUIRING 400 LAL_YES at $0.46... [FILLED]`
  `[09:41:45] REGIME SWING DETECTED: CLUTCH_TIME (LAL vs DEN)`
  `[09:42:01] HEDGING: EXECUTING 200 DEN_NO at $0.51... [FILLED]`
- Uses Framer Motion's AnimatePresence to slide new logs from the top down.

**3. `<RegimeRadar>`**
- A cool radar chart that visualizes the current output of our `markov.py` engine.
- Are we in a momentum swing? Is fatigue factoring in heavily to the remaining 10 minutes of the event? Shows visual weight.

## 3. The Backend Connection Loop
- Relies heavily on the backend WebSocket connection to `/api/ws` (already prototyped in Python engine routes).
- Every time a price jumps on an event, flash the corresponding cell green/red momentarily.

## Next Steps
- Establish the WebSockets context in React.
- Scaffold the `TerminalView` component hierarchy (Depth + Execution Tape).
- Implement raw visual styling to mimic advanced institutional tools.
