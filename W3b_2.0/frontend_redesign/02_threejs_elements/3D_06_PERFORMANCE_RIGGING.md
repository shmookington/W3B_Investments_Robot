# 3D Element Phase 6: Performance Rigging & Scroll Sync
**Location:** Global `<Canvas>` Wrapper across the entire Next.js Application.

## 1. Geometric Concept
A beautiful 3D site is utterly useless if it drains an LP's laptop battery or turns their iPhone into a space heater. In a quantitative fund, the data and execution speed are paramount. The WebGL `<Canvas>` cannot hold up the HTML DOM loading, nor can it continually loop 60 times a second if the user is simply reading an article or staring at a static dashboard.

## 2. Technical Implementation
- **Scroll Syncing (`drei/ScrollControls`)**: We link the active Z-axis camera movement tightly to the browser's scroll wheel. At the top of the page, the camera is above the "Atlantis" pillars. As they scroll down, the camera sinks into the Volumetric Fog `#050A15`. This seamlessly bridges 2D HTML scrolling with heavy 3D physical depth.
- **On-Demand Rendering (`frameloop="demand"`)**: By default, React Three Fiber runs a continuous 60fps loop. We immediately override this. The canvas only re-renders if a prop changes (like volatility spiking or the mouse moving). If the user AFKs to read the `Audit Log`, GPU usage drops to mathematically `0.00%`.
- **Adaptive Pixel Ratio (`dpr={[1, 2]}`)**: High-end MacBooks have a device pixel ratio of 2 (Retina). Old Androids have 1. We let R3F automatically scale down the resolution if the device begins to drop frames, prioritizing smooth animations over sharp particle edges.
- **Baking Lightmaps**: Since the Obsidian Pillars are static, we calculate how the main spotlight hits them one time in standard modeling software (Blender) and load that calculation as a pre-baked texture. The sun doesn't move, so the GPU doesn't have to calculate shadow coordinates in real-time.

## 3. Interaction Mechanics
- The HTML DOM and the 3D world are completely separated layers. If WebGL fails for any reason (older enterprise firewalls blocking WebGL context, strict privacy browsers), the Next.js app natively falls back to a stark, clean Charcoal/Gold DOM, still feeling like a premium institutional fund.
