'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════
   PERFORMANCE TIERS
   ═══════════════════════════════════════════════════
   Tier 1: Ultrawide desktop, dedicated GPU — ALL effects
   Tier 2: Standard desktop/laptop — Full effects, 30 particles
   Tier 3: Tablet — No particles, simplified grid, reduced blur
   Tier 4: Mobile — No particles/parallax, CSS-only grid, no shaders
   Tier 5: Low-end mobile — Minimal effects, solid backgrounds
   ═══════════════════════════════════════════════════ */

export type PerformanceTier = 1 | 2 | 3 | 4 | 5;

export interface PerformanceConfig {
    tier: PerformanceTier;
    particles: boolean;
    particleCount: number;
    parallax: boolean;
    shaders: boolean;
    blurRadius: number;      // backdrop-filter blur px
    gridComplexity: 'full' | 'simple' | 'css-only' | 'none';
    transitions: 'full' | 'basic' | 'none';
    solidBackgrounds: boolean;
}

const TIER_CONFIGS: Record<PerformanceTier, PerformanceConfig> = {
    1: { tier: 1, particles: true, particleCount: 80, parallax: true, shaders: true, blurRadius: 12, gridComplexity: 'full', transitions: 'full', solidBackgrounds: false },
    2: { tier: 2, particles: true, particleCount: 30, parallax: true, shaders: true, blurRadius: 12, gridComplexity: 'full', transitions: 'full', solidBackgrounds: false },
    3: { tier: 3, particles: false, particleCount: 0, parallax: false, shaders: false, blurRadius: 6, gridComplexity: 'simple', transitions: 'full', solidBackgrounds: false },
    4: { tier: 4, particles: false, particleCount: 0, parallax: false, shaders: false, blurRadius: 4, gridComplexity: 'css-only', transitions: 'basic', solidBackgrounds: false },
    5: { tier: 5, particles: false, particleCount: 0, parallax: false, shaders: false, blurRadius: 0, gridComplexity: 'none', transitions: 'none', solidBackgrounds: true },
};

const STORAGE_KEY = 'w3b_perf_tier';

/* ═══════════════════════════════════════════════════
   GPU PROBE — WebGL capability detection
   ═══════════════════════════════════════════════════ */

function probeGPU(): 'high' | 'mid' | 'low' | 'none' {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (!gl) return 'none';

        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string : '';
        const rendererLower = renderer.toLowerCase();

        // High-end dedicated GPUs
        if (/nvidia|geforce|rtx|gtx|radeon rx|amd/i.test(rendererLower)) return 'high';
        // Integrated but decent (Intel Iris, Apple M-series)
        if (/iris|apple m|apple gpu/i.test(rendererLower)) return 'mid';
        // Basic integrated
        if (/intel|mesa|llvmpipe|swiftshader/i.test(rendererLower)) return 'low';

        return 'mid';
    } catch {
        return 'none';
    }
}

/* ═══════════════════════════════════════════════════
   DEVICE CLASSIFICATION
   ═══════════════════════════════════════════════════ */

function classifyDevice(): PerformanceTier {
    const width = window.innerWidth;
    const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency || 2;
    const gpu = probeGPU();

    // Ultrawide desktop with good GPU
    if (width >= 2560 && gpu === 'high' && cores >= 8) return 1;
    // Standard desktop
    if (width >= 1024 && !isTouchPrimary && gpu !== 'none') return 2;
    // Tablet
    if (width >= 768 && isTouchPrimary) return 3;
    // Mobile
    if (isTouchPrimary && cores >= 4) return 4;
    // Low-end
    return 5;
}

/* ═══════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════ */

export function usePerformanceTier(): PerformanceConfig & {
    downgrade: () => void;
    upgrade: () => void;
    setTier: (t: PerformanceTier) => void;
} {
    const [tier, setTierState] = useState<PerformanceTier>(2);
    const fpsFrames = useRef<number[]>([]);
    const lowFpsStart = useRef<number | null>(null);

    // Initialize: cached or detect
    useEffect(() => {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            const parsed = parseInt(cached, 10) as PerformanceTier;
            if (parsed >= 1 && parsed <= 5) {
                setTierState(parsed);
                return;
            }
        }
        const detected = classifyDevice();
        setTierState(detected);
        localStorage.setItem(STORAGE_KEY, String(detected));
    }, []);

    // Set tier + cache
    const setTier = useCallback((t: PerformanceTier) => {
        const clamped = Math.max(1, Math.min(5, t)) as PerformanceTier;
        setTierState(clamped);
        localStorage.setItem(STORAGE_KEY, String(clamped));
    }, []);

    const downgrade = useCallback(() => {
        setTierState((prev) => {
            const next = Math.min(5, prev + 1) as PerformanceTier;
            localStorage.setItem(STORAGE_KEY, String(next));
            console.warn(`[W3B Perf] Auto-downgraded: Tier ${prev} → Tier ${next}`);
            return next;
        });
    }, []);

    const upgrade = useCallback(() => {
        setTierState((prev) => {
            const next = Math.max(1, prev - 1) as PerformanceTier;
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    }, []);

    // FPS monitoring — auto-downgrade if <30fps for 2s
    useEffect(() => {
        let animId: number;
        let lastTime = performance.now();

        const tick = (now: number) => {
            const delta = now - lastTime;
            lastTime = now;
            const fps = 1000 / delta;

            fpsFrames.current.push(fps);
            if (fpsFrames.current.length > 60) fpsFrames.current.shift();

            // Check average over last 60 frames
            const avg = fpsFrames.current.reduce((a, b) => a + b, 0) / fpsFrames.current.length;

            if (avg < 30) {
                if (lowFpsStart.current === null) {
                    lowFpsStart.current = now;
                } else if (now - lowFpsStart.current > 2000) {
                    // 2 consecutive seconds below 30fps
                    downgrade();
                    lowFpsStart.current = null;
                    fpsFrames.current = [];
                }
            } else {
                lowFpsStart.current = null;
            }

            animId = requestAnimationFrame(tick);
        };

        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [downgrade]);

    // Battery awareness
    useEffect(() => {
        if (!('getBattery' in navigator)) return;
        let mounted = true;

        (navigator as NavigatorWithBattery).getBattery().then((battery: BatteryManager) => {
            if (!mounted) return;
            const check = () => {
                if (battery.level < 0.2 && !battery.charging) {
                    downgrade();
                }
            };
            check();
            battery.addEventListener('levelchange', check);
            return () => battery.removeEventListener('levelchange', check);
        }).catch(() => { });

        return () => { mounted = false; };
    }, [downgrade]);

    return { ...TIER_CONFIGS[tier], downgrade, upgrade, setTier };
}

/* ═══════════════════════════════════════════════════
   TYPE AUGMENTATION FOR BATTERY API
   ═══════════════════════════════════════════════════ */

interface BatteryManager extends EventTarget {
    charging: boolean;
    level: number;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
}

interface NavigatorWithBattery extends Navigator {
    getBattery(): Promise<BatteryManager>;
}
