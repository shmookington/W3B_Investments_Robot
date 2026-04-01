# Frontend Redesign Phase 11: High-Frequency WebSockets & State

**Status:** APPROVED
**Topic:** Core Frontend Execution Architecture (Under the Hood)

## 1. The Strategy: The Pipeline
You cannot run a "sophisticated fund" UI if the React state re-renders the entire page every time a single probability or price shifts by 0.01%. The app will stutter, die, and feel cheap. 
W3B's frontend state management requires a complete rebuild to handle thousands of incoming ticks.

## 2. Intricacies & Implementation Details

**1. `<Zustand / Jotai Integration>`**
- We must immediately strip out React `useState` and `Context` for any core market streaming data.
- The `TerminalView` specifically requires atomic state updates. If the LAL vs DEN price shifts, ONLY that specific `<td>` cell should re-render.

**2. `<WebWorker Offloading>`**
- Calculating the portfolio's total delta and PnL locally in the browser when actively holding 50+ event shares at varying market prices will choke the main thread.
- Move heavy array sorting (e.g., dynamically ordering the `HoldingsGrid` by "Largest Move %") into a detached Web Worker so scrolling the UI remains locked at 120fps.

**3. `<WebSocket Connection Recovery>`**
- The UI must handle the "Dead Oracle" state gracefully. 
- If the WebSocket feed from `alpha.py` dies or the Hetzner VPS restarts, the app flashes a `<ConnectionHalted>` warning in bright Red/Charcoal, immediately locking the UI to prevent any manual overrides against stale prices.
