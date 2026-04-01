# 3D Element Phase 1: Volumetric Fog & Abyssal Lighting
**Location:** Floating beneath the global `<Canvas>` context.

## 1. Geometric Concept
To create the "Lost City of Atlantis" scale, the background cannot be a solid color or gradient. It must have depth. We achieve depth not through geometry, but through atmospheric scattering and fog.

## 2. Technical Implementation
- **`<fogExp2>` Integration:** Use exponential fog (`fogExp2`) built into Three.js rather than linear fog. Exponential fog creates a much more realistic, suffocating drop-off in visibility, crucial for the deep-water aesthetic.
- **Color Hex:** Set fog color to a deep, abyssal navy/charcoal (`#050A15`). This perfectly blends the edge of the HTML screen into the 3D void.
- **Spotlights & Ambient Light:** We keep global `<ambientLight>` extremely low (0.1 intensity). We use deep, high-intensity `<SpotLight>` components casting downward to mimic sunlight piercing the ocean surface, creating dramatic highlights on gold objects below.

## 3. Shader Considerations
- For maximum performance, standard material lights are fine, but if we want true "God Rays" piercing through the water, we need to implement `@react-three/postprocessing`'s `<GodRays>` component, binding it to a hidden mesh acting as the sun high above the viewport.
