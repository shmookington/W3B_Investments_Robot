'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUIStore } from '@/store/uiStore';

const vertexShader = `
  uniform float uTime;
  uniform float uSpeedMultiplier;
  
  attribute vec3 aRandomParams; // [random.x, random.y, random.z]
  
  varying vec3 vPosition;
  varying float vLife;

  // Simple 3D noise function chunk (Stefan Gustavson's Simplex noise)
  vec3 glsl_mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 glsl_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 glsl_permute(vec4 x) { return glsl_mod289(((x*34.0)+1.0)*x); }
  vec4 glsl_taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; 
    vec3 x3 = x0 - D.yyy;      

    i = glsl_mod289(i);
    vec4 p = glsl_permute( glsl_permute( glsl_permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = glsl_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // instanceMatrix is provided by <instancedMesh> natively
    vec3 pos = instanceMatrix[3].xyz;
    
    // Add noise to simulate water currents (Simplex Flow Field)
    float time = (uTime * 0.2 + aRandomParams.x * 100.0) * uSpeedMultiplier; 
    
    vec3 noisePos = pos * 0.05 + time * 0.5;
    vec3 noise = vec3(
      snoise(noisePos),
      snoise(noisePos + vec3(43.2, 12.1, 7.3)),
      snoise(noisePos + vec3(19.2, 63.4, 21.8))
    );

    // Flow upwards primarily, with lateral noise
    vec3 animatedPos = pos + noise * 4.0;
    
    // Y-looping so particles don't fly off screen forever
    // Range is from -40 to +40.
    float globalY = animatedPos.y + (uTime * 4.0 * uSpeedMultiplier * aRandomParams.y);
    animatedPos.y = (mod(globalY + 40.0, 80.0)) - 40.0;

    // Apply scaling per instance
    float particleScale = aRandomParams.z;
    
    vec4 modelPosition = modelMatrix * vec4(animatedPos, 1.0);
    // Add local geometry vertices to instance position with their individual scale
    modelPosition.xyz += position * particleScale;
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    vPosition = viewPosition.xyz;
    
    // Fading out particles at top/bottom extremes 
    vLife = 1.0 - smoothstep(20.0, 40.0, abs(animatedPos.y)); 
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  
  varying vec3 vPosition;
  varying float vLife;

  void main() {
    // Depth-based opacity fade out to simulate fog blending
    float depth = gl_FragCoord.z / gl_FragCoord.w; 
    float fogFactor = smoothstep(15.0, 45.0, depth);

    // Combine Y-boundary fading and Z-depth Fog fading
    float alpha = (1.0 - fogFactor) * vLife * 0.5;
    
    if(alpha < 0.01) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function PlanktonSwarm() {
  const [particleCount, setParticleCount] = useState(10000); 
  
  // Throttle down on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setParticleCount(3000);
    }
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    
    const dummy = new THREE.Object3D();
    const randoms = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        dummy.position.set(
            (Math.random() - 0.5) * 100, // X wide
            (Math.random() - 0.5) * 80, // Y 
            (Math.random() - 0.5) * 50 - 15 // Z deep
        );
        dummy.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        // aRandomParams: [timeOffset, speedVariation, sizeVariation]
        randoms[i * 3 + 0] = Math.random(); 
        randoms[i * 3 + 1] = Math.random() * 0.5 + 0.5; // Upward speed
        randoms[i * 3 + 2] = Math.random() * 0.15 + 0.05; // Size scale
    }
    
    meshRef.current.geometry.setAttribute('aRandomParams', new THREE.InstancedBufferAttribute(randoms, 3));
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [particleCount]);

  useFrame((state, delta) => {
    if (materialRef.current) {
        materialRef.current.uniforms.uTime.value += delta;
        
        // Dynamic surge upward when interacting with UI
        const isHovered = !!useUIStore.getState().hoveredNavElement;
        const targetSpeed = isHovered ? 4.0 : 0.8;
        materialRef.current.uniforms.uSpeedMultiplier.value = THREE.MathUtils.lerp(
            materialRef.current.uniforms.uSpeedMultiplier.value,
            targetSpeed,
            delta * 5.0
        );
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]} >{/* @ts-ignore */}
      <octahedronGeometry args={[1, 0]} />
      <shaderMaterial 
        ref={materialRef}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
            uTime: { value: 0 },
            uSpeedMultiplier: { value: 1.0 },
            uColor: { value: new THREE.Color('#00e5ff') }
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </instancedMesh>
  );
}
