'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════
   THE MONOLITH — 2001 proportions (1×4×9)
   ═══════════════════════════════════════════════════ */
function Monolith() {
    const meshRef = useRef<THREE.Mesh>(null);
    const { pointer } = useThree();

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        // Slow Y rotation
        meshRef.current.rotation.y += 0.15 * delta;
        // Subtle mouse follow (max 3px equivalent)
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, pointer.y * 0.03, 0.05);
        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, pointer.x * 0.15, 0.03);
    });

    return (
        <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.3}>
            <mesh ref={meshRef} castShadow>
                {/* 2001 proportions: 1 × 4 × 9 scaled down */}
                <boxGeometry args={[0.6, 2.4, 0.15]} />
                <meshPhysicalMaterial
                    color="#050508"
                    metalness={0.95}
                    roughness={0.05}
                    reflectivity={1}
                    clearcoat={1}
                    clearcoatRoughness={0.02}
                    envMapIntensity={1.5}
                />
            </mesh>
        </Float>
    );
}

/* ═══════════════════════════════════════════════════
   DUST MOTES — Tiny floating particles
   ═══════════════════════════════════════════════════ */
function DustMotes() {
    const count = 200;
    const ref = useRef<THREE.Points>(null);

    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 6;
            arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }
        return arr;
    }, []);

    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y = state.clock.elapsedTime * 0.02;
        ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.008}
                color="#00f0ff"
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation
            />
        </points>
    );
}

/* ═══════════════════════════════════════════════════
   POST-PROCESSING — Bloom + ChromaticAberration + Vignette
   ═══════════════════════════════════════════════════ */
function PostFX() {
    return (
        <EffectComposer>
            <Bloom
                intensity={0.8}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                mipmapBlur
            />
            <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={new THREE.Vector2(0.0005, 0.0005)}
                radialModulation={false}
                modulationOffset={0}
            />
            <Vignette darkness={0.6} offset={0.3} />
        </EffectComposer>
    );
}

/* ═══════════════════════════════════════════════════
   LOADING STATE — Black screen with pulsing text
   ═══════════════════════════════════════════════════ */
function LoadingFallback() {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#030308',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            color: 'rgba(0, 240, 255, 0.3)',
        }}>
            MATERIALIZING...
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN SCENE EXPORT
   ═══════════════════════════════════════════════════ */
export function MonolithScene() {
    return (
        <div style={{ width: '100%', height: '60vh', position: 'relative', minHeight: 400 }}>
            <Suspense fallback={<LoadingFallback />}>
                <Canvas
                    camera={{ position: [0, 0, 4], fov: 45 }}
                    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                    dpr={[1, 2]}
                    style={{ background: 'transparent' }}
                >
                    {/* Lighting */}
                    <ambientLight intensity={0.1} />
                    <directionalLight position={[2, 5, 3]} intensity={0.4} color="#e0e0ff" />
                    <pointLight position={[0, -3, 0]} intensity={0.6} color="#00f0ff" distance={8} decay={2} />
                    <pointLight position={[-2, 2, 1]} intensity={0.15} color="#4060ff" distance={6} decay={2} />

                    {/* Environment for reflections */}
                    <Environment preset="night" />

                    {/* Starfield */}
                    <Stars
                        radius={50}
                        depth={60}
                        count={6000}
                        factor={3}
                        saturation={0}
                        fade
                        speed={0.5}
                    />

                    {/* The Monolith */}
                    <Monolith />

                    {/* Floating dust particles */}
                    <DustMotes />

                    {/* Post-processing */}
                    <PostFX />
                </Canvas>
            </Suspense>
        </div>
    );
}
