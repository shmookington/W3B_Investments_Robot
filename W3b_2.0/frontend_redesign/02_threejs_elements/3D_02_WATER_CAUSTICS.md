# 3D Element Phase 2: Refraction & Water Caustics
**Location:** Overlaying the main HTML DOM, simulating an underwater camera.

## 1. Geometric Concept
Caustics are the dancing light patterns seen at the bottom of a swimming pool or the ocean floor. By layering a subtle caustic effect natively in Three.js, we immediately establish the "Lost City" ambiance without heavy geometry.

## 2. Technical Implementation
- **`<Water>` Shader or `<MeshTransmissionMaterial>`:** We will not simulate high-poly ocean geometry. Instead, we use `@react-three/drei`'s `MeshTransmissionMaterial` applied to massive, flat invisible planes floating near the camera. This bends light bouncing off 3D objects, creating refraction.
- **Caustic Mapping:** Using a rotating black-and-white perlin noise map applied to the main downward-pointing `<SpotLight>`. As the light hits 3D objects (like our obsidian data pillars), it dynamically paints moving, watery light ripples across them.
- **Chromatic Aberration (Lens Distortion):** We insert a `<ChromaticAberration>` post-processing pass. When light passes through thick water, the RGB channels split near the edges of the lens. We set this incredibly low (barely perceptible) to give the illusion of thick liquid density between the viewer and the text.

## 3. Performance Warning
- Caustics mathematically multiply light processing. If mobile devices throttle, we disable the dynamic light mapper and apply a pre-rendered moving `textureMap` loop natively onto the objects, resulting in exactly 1 draw call.
