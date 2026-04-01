'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Vignette, ChromaticAberration, GodRays } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useUIStore } from '@/store/uiStore';
import { PlanktonSwarm } from './particles/PlanktonSwarm';
import { ProbabilityMesh } from './ProbabilityMesh';

// Generates a tileable noise texture imitating water caustics
function createCausticTexture() {
  if (typeof window === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const imgData = ctx.createImageData(size, size);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cx = x * 0.15;
      const cy = y * 0.15;
      const v1 = Math.sin(cx) + Math.cos(cy);
      const v2 = Math.sin(cx + cy) + Math.cos(cx - cy);
      // High contrast thresholding for caustic-like thin lines
      let val = Math.abs(v1 + v2) / 4; 
      val = Math.pow(val, 4) * 255 * 3; 
      if (val > 255) val = 255;
      
      const i = (x + y * size) * 4;
      imgData.data[i] = val;     // R
      imgData.data[i+1] = val;   // G
      imgData.data[i+2] = val;   // B
      imgData.data[i+3] = 255;   // A
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Generates PBR texture maps natively for Obsidian Pillars
function createObsidianPBRMaps() {
  if (typeof window === 'undefined') return { normalMap: null, roughnessMap: null, metalnessMap: null };
  const size = 512;
  
  const createTex = (generator: (ctx: CanvasRenderingContext2D, size: number) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) generator(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6); // Stretch vertically for cylinders
    return tex;
  };

  const normalMap = createTex((ctx, srcSize) => {
    const data = ctx.createImageData(srcSize, srcSize);
    for (let x = 0; x < srcSize; x++) {
      for (let y = 0; y < srcSize; y++) {
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const idx = (x + y * srcSize) * 4;
        data.data[idx] = 128 + (noise - 0.5) * 50;     // R
        data.data[idx+1] = 128 + (noise - 0.5) * 50;   // G
        data.data[idx+2] = 255;                        // B
        data.data[idx+3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
  });

  const roughnessMap = createTex((ctx, srcSize) => {
    const data = ctx.createImageData(srcSize, srcSize);
    for (let x = 0; x < srcSize; x++) {
      for (let y = 0; y < srcSize; y++) {
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const rVal = noise > 0.85 ? 0.9 : 0.15; // Mostly smooth glass with random rough pits
        const idx = (x + y * srcSize) * 4;
        const c = rVal * 255;
        data.data[idx] = c; data.data[idx+1] = c; data.data[idx+2] = c; data.data[idx+3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
  });

  const metalnessMap = createTex((ctx, srcSize) => {
    ctx.fillStyle = 'rgb(204, 204, 204)'; // High metalness uniformly (0.8)
    ctx.fillRect(0, 0, srcSize, srcSize);
  });

  return { normalMap, roughnessMap, metalnessMap };
}

// Massive, jagged structures in the abyss
function ObsidianPillars() {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  // Dynamically generate PBR without downloads
  const pbrMaps = useMemo(() => createObsidianPBRMaps(), []);

  const pillars = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 40 - 20
      ] as [number, number, number],
      rotation: [Math.random() * 0.1, Math.random() * Math.PI, Math.random() * 0.1] as [number, number, number],
      scale: [Math.random() * 3 + 4, Math.random() * 40 + 60, Math.random() * 3 + 4] as [number, number, number]
    }));
  }, []);

  useFrame((state, delta) => {
    const isVaultHovered = useUIStore.getState().hoveredNavElement?.toLowerCase().includes('vault');
    const targetEmissiveIntensity = isVaultHovered ? 1.5 : 0.05;

    if (groupRef.current) {
      groupRef.current.children.forEach((mesh, i) => {
        // Ancient, glacial rotation speed
        mesh.rotation.y += 0.0001 * (i % 2 === 0 ? 1 : -1);
        
        const mat = materialsRef.current[i];
        if (mat) {
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            targetEmissiveIntensity,
            delta * 3
          );
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {pillars.map((props, i) => (
        <mesh key={i} position={props.position} rotation={props.rotation} scale={props.scale}>
          <cylinderGeometry args={[1, 1, 1, 32]} />
          <meshStandardMaterial 
            ref={(el) => {
              // @ts-ignore
              materialsRef.current[i] = el;
            }}
            color="#050a12"
            normalMap={pbrMaps.normalMap}
            roughnessMap={pbrMaps.roughnessMap}
            metalnessMap={pbrMaps.metalnessMap}
            metalness={0.9} 
            emissive="#00e5ff" // Cyan glow specifically for Vault context
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  useFrame((state, delta) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const maxScroll = typeof document !== 'undefined' ? Math.max(1, document.body.scrollHeight - window.innerHeight) : 1;
    const scrollPercent = scrollY / maxScroll; 
    
    // Dive camera deep into fog as user scrolls down HTML page
    const targetZ = 15 - (scrollPercent * 13);
    const targetX = (state.pointer.x * 4);
    const targetY = (state.pointer.y * 4) + 2; 
    
    state.camera.position.x += (targetX - state.camera.position.x) * delta * 1.5;
    state.camera.position.y += (targetY - state.camera.position.y) * delta * 1.5;
    state.camera.position.z += (targetZ - state.camera.position.z) * delta * 2.5;
    state.camera.lookAt(0, 0, 0);

    const cam = state.camera as THREE.PerspectiveCamera;
    const isHovered = !!useUIStore.getState().hoveredNavElement;
    const targetFov = isHovered ? 40 : 45;
    
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, delta * 3);
    cam.updateProjectionMatrix();
  });
  return null;
}

export function DeepWaterScene() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [sunRef, setSunRef] = useState<THREE.Mesh | null>(null);
  const causticTexture = useMemo(() => createCausticTexture(), []);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const fogColor = new THREE.Color('#050A15');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDesktop(window.innerWidth > 768);
      const handleResize = () => setIsDesktop(window.innerWidth > 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useFrame((state, delta) => {
    // Animate Caustics Spotlight
    if (spotLightRef.current && spotLightRef.current.map) {
      spotLightRef.current.map.offset.x -= 0.02 * delta;
      spotLightRef.current.map.offset.y -= 0.05 * delta;
    }
  });

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fogExp2 attach="fog" args={[fogColor, 0.025]} />

      <ambientLight intensity={0.1} color="#ffffff" />
      <directionalLight position={[0, 10, 5]} intensity={1.5} color="#00e5ff" />
      
      {/* Caustics Spotlight tracking dark moving lines across meshes */}
      <spotLight 
        ref={spotLightRef}
        position={[0, 20, 10]} 
        angle={1.0} 
        penumbra={0.8} 
        intensity={5.0} 
        color="#d4af37" 
        map={causticTexture!}
      />

      <CameraRig />

      {/* Invisible plane causing heavy water distortion & refraction placed immediately in front of scene */}
      {isDesktop && (
        <mesh position={[0, 0, 10]} rotation={[0, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <MeshTransmissionMaterial 
            samples={16} 
            resolution={512} 
            transmission={0.9} 
            thickness={2.0} 
            roughness={0.1} 
            distortion={0.3} 
            distortionScale={0.5} 
            temporalDistortion={0.05} 
            chromaticAberration={0.06} // Slight aberration in the fluid
            background={fogColor}
          />
        </mesh>
      )}

      {/* Hidden mesh acting as the sun for GodRays */}
      <mesh ref={setSunRef} position={[0, 50, -20]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.1} />
      </mesh>

      <ObsidianPillars />

      <PlanktonSwarm />
      
      <ProbabilityMesh />

      {/* Desktop-only Post-Processing Pipeline (GPU Heavy) */}
      {isDesktop && sunRef && (
        <EffectComposer>
          <GodRays 
            sun={sunRef} 
            blendFunction={BlendFunction.SCREEN} 
            samples={60} 
            density={0.96} 
            decay={0.9} 
            weight={0.4} 
            exposure={0.6} 
            clampMax={1} 
            blur={true} 
          />
          <Vignette eskil={false} offset={0.1} darkness={0.8} blendFunction={BlendFunction.NORMAL} />
          {/* Chromatic aberration barely perceptible at lens edges as specified */}
          <ChromaticAberration 
            blendFunction={BlendFunction.SCREEN} 
            offset={new THREE.Vector2(0.001, 0.001)} 
            radialModulation={false}
            modulationOffset={0}
          />
        </EffectComposer>
      )}
    </>
  );
}
