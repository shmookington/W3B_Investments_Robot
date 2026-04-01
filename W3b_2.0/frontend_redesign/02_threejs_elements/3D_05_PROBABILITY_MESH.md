# 3D Element Phase 5: Live Probability Mesh Deformation
**Location:** Central UI `<TerminalView>`, rendering as an active background plane behind the HTML numbers.

## 1. Geometric Concept
Most quant funds use flat line-charts for probabilities. The "Atlantis" vibe suggests a more organic visualizer: an ocean floor grid or wireframe mesh that ripples violently when volatility hits, and flattens out during low-volatility regimes (like Garbage Time). We visually map the `API`'s Brier Score and Live Edge multiplier directly onto a physical plane in 3D space.

## 2. Technical Implementation
- **The `<PlaneGeometry>` Subdivisions:** We instantiate a `PlaneGeometry(width, height, widthSegments, heightSegments)`. The more segments, the smoother the wave, but the heavier the CPU lift. We will hardcode 64x64 segments.
- **`useFrame` Mesh Distortion (The Engine):**
  - We listen to our custom Zustand store `useMarketStore(state => state.currentVolatility)`.
  - Inside the `useFrame` hook, we iterate over the plane's `position.array` (specifically the Z-axis of each vertex) using a Sine wave combined with Simplex Noise.
  - The amplitude of the water wave mapping is strictly multiplied by `currentVolatility`. If the API signals "Neutral", the mesh settles. If "Clutch Time" hits, the waves spike violently.
- **Wireframe Materials:** We apply `MeshBasicMaterial` with `wireframe={true}` and color set to a glowing translucent cyan (`rgba(0, 229, 255, 0.4)`). This creates a hologram-grid effect that ripples beneath the user's trading tape.

## 3. Interaction Mechanics
- This is purely passive data visualization running concurrently with the mathematical engine. It exists to turn raw, flat statistical volatility into physical depth.
