'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMarketStore } from '@/store/marketStore';

const vertexShader = `
  uniform float uTime;
  uniform float uVolatility;
  
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simple 2D Simplex Noise for wave displacement
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                    + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Apply multiple octaves of noise multiplied by uVolatility
    // Using pos.y instead of pos.z since plane is generated on XY plane
    float noise1 = snoise(vec2(pos.x * 0.05, pos.y * 0.05 + uTime * 0.5));
    float noise2 = snoise(vec2(pos.x * 0.1, pos.y * 0.1 - uTime * 0.3));
    
    // Warp the mesh along the Z axis (which becomes Y when the mesh is rotated -90 deg on X)
    float distortion = (noise1 * 3.0 + noise2 * 1.5) * uVolatility;
    pos.z += distortion;

    vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    // Fade out at far edges so the mesh seamlessly blends into the background fog
    // We check distance from center globally
    float dist = length(vPosition.xz);
    float edgeFade = smoothstep(55.0, 20.0, dist);

    gl_FragColor = vec4(uColor, uOpacity * edgeFade);
  }
`;

export function ProbabilityMesh() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      const currentVolatility = useMarketStore.getState().currentVolatility;
      // Smoothly approach the target volatility
      materialRef.current.uniforms.uVolatility.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uVolatility.value,
        currentVolatility,
        0.05 
      );
    }
  });

  return (
    <mesh position={[0, -28, -20]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 100x100 grid, 64 segments = dense wireframe that organically ripples */}
      <planeGeometry args={[120, 120, 64, 64]} />
      <shaderMaterial 
        ref={materialRef}
        wireframe={true}
        transparent={true}
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uVolatility: { value: 1.0 }, 
          uColor: { value: new THREE.Color('#00e5ff') },
          uOpacity: { value: 0.15 } // Reduced opacity to not distract from UI
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
