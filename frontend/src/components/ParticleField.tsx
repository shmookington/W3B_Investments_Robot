'use client';

import { useEffect, useState } from 'react';
import { useCRTStore } from '@/components/CRTOverlay';
import styles from './ParticleField.module.css';

/* ─── Generate CSS properties for random particles ─── */
function generateParticles(count: number) {
    return Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        // Very slow drift: 30s to 70s to cross screen
        duration: `${30 + Math.random() * 40}s`,
        // Separate fade cycle: 10s to 30s
        fadeDuration: `${10 + Math.random() * 20}s`,
        // Negative delay so they are on screen immediately instead of spawning at bottom
        delay: `-${Math.random() * 50}s`,
        // Random horizontal drift: -50px to +50px
        driftX: `${(Math.random() - 0.5) * 100}px`,
    }));
}

export function ParticleField() {
    const [particles, setParticles] = useState<Array<any>>([]);
    const isEnabled = useCRTStore((state) => state.enabled);

    useEffect(() => {
        // 40 particles is enough for depth without cluttering
        setParticles(generateParticles(40));
    }, []);

    // Respect accessibility toggle — disable particles when CRT effects are off
    if (!isEnabled) return null;

    return (
        <div className={styles.particlesContainer} aria-hidden="true">
            {particles.map((p, i) => (
                <div
                    key={i}
                    className={styles.particle}
                    style={
                        {
                            left: p.left,
                            animationDuration: `${p.duration}, ${p.fadeDuration}`,
                            animationDelay: `${p.delay}, ${p.delay}`,
                            '--drift-x': p.driftX,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}
