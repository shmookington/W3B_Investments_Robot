# 3D Element Phase 4: The Obsidian Data Pillars
**Location:** Main geometric centerpieces of the WebGL `Canvas`, situated deep within the volumetric fog.

## 1. Geometric Concept
The "Atlantis" vibe comes from ancient, monolithic structures jutting out from the ocean floor. We will build 3 to 5 massive `CylinderGeometry` objects, textured as unpolished obsidian or dark platinum. These pillars do not move—they simply anchor the physical depth of the scene.

## 2. Technical Implementation
- **Texture Mapping:** A basic flat dark color is unrealistic. We apply a standard PBR (Physically Based Rendering) texture using `@react-three/drei`'s `useTexture`. The maps included:
  - `normalMap`: Gives the pillars ancient, rocky/metallic bumps without adding mathematical vertices to the geometry.
  - `roughnessMap`: Makes the pillars scatter light organically. The caustics (from Phase 2) will bounce beautifully off this rough, ancient surface.
  - `metalnessMap`: Tells the renderer these are made of heavy platinum/gold, allowing the spot lights to gleam intensely off specific reflective edges.
- **Rotation Scripting:** In the `useFrame` hook, we add incredibly slow rotation (e.g., `ref.current.rotation.y += 0.0001`). It shouldn't look like they are spinning—it should just look like the universe is slightly shifting, giving an eerie, massive scale to the fund's interface.

## 3. Interaction Mechanics
- Hovering the mouse directly over the HTML "Vault" tab shoots an invisible 3D raycast from the mouse pointer. When it hits an Obsidian Pillar in the background, the pillar emits a dull, thumping gold or cyan glow, tethering the flat HTML UI to the massive 3D structures hovering behind it.
