'use client';

import { Canvas } from '@react-three/fiber';
import { DeepWaterScene } from './DeepWaterScene';

export function GlobalWebGLCanvas() {
  return (
    <div className="canvas-wrapper">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        gl={{ antialias: false, alpha: false, stencil: false, depth: true }}
        dpr={[1, 2]}
      >
        <DeepWaterScene />
      </Canvas>
    </div>
  );
}
