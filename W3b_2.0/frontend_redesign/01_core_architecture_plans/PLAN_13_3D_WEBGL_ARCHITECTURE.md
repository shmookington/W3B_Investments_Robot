# Frontend Redesign Phase 13: 3D WebGL Architecture (The Atlantis Vibe)

**Status:** APPROVED
**Topic:** Integrating React Three Fiber for a Deep, Immersive 3D Experience

## 1. The Strategy: The "Dark Pool" Visual Metaphor
Financial dark pools are where hidden institutional liquidity lives. We are styling W3B as an abyssal, deep-water environment ("Lost City of Atlantis"). The goal is to make the site feel vast, profound, and heavy, rather than a flat, empty webpage. We achieve this using raw WebGL rendering behind our HTML UI.

## 2. Intricacies & Implementation Details

**1. `<GlobalWebGLCanvas>`**
- We wrap the entire Next.js `<Layout>` in a fixed, absolute-positioned `<Canvas>` from `@react-three/fiber`. 
- This canvas sits at `z-index: -1`, meaning it exists purely in the background while standard HTML text and glass buttons float on top of it.

**2. Deep Water Post-Processing**
- We use `@react-three/postprocessing` to add specific camera effects that simulate being deep underwater:
  - **Volumetric Fog:** The background slowly fades into pitch-black Navy/Charcoal, giving infinite depth.
  - **Chromatic Aberration:** Very slight color shifting on the edges of the screen, mimicking water refraction.
  - **Caustics:** If performance allows, animated light patterns projecting downward over 3D objects, acting like light breaking through the surface of the ocean.

**3. Interactive 3D Geometry**
- **Floating Dust/Plankton Particles:** Simple instanced meshes of tiny glowing cyan specks that lazily drift upward and react slightly to mouse movements. (Extremely cheap on GPU).
- **The Obsidian Pillars:** Monolithic, dark metallic geometric structures slowly rotating far in the background. As the user hovers over "Events" or "Positions" in the HTML UI, these ancient pillars react, glow Gold, or shift slightly, connecting the user's HTML interactions to the 3D world.

## 3. Performance & GPU Constraints
1. **No Real-Time Shadows:** Shadows kill frame rates. We will use absolute dark materials (`MeshBasicMaterial`) or bake the lighting so lighting calculations take 0ms.
2. **Scroll Rigging:** As the user scrolls down the landing page, the 3D camera sinks deeper into the fog (parallax depth), creating physical weight.
3. **Adaptive Pixel Ratio:** If the user is on a low-end phone, we automatically drop the canvas resolution scale (e.g., `dpr={0.5}`) to keep the device from heating up while preserving the deep water aesthetic.

## Next Steps
- Install `three`, `@react-three/fiber`, and `@react-three/drei`.
- Build the initial barebones `<Canvas>` wrapper around `app/layout.tsx`.
- Create the infinite fog environment and test baseline 60fps locking on mobile.
