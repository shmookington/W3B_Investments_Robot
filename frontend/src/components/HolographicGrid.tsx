'use client';

import { useEffect, useState } from 'react';
import styles from './HolographicGrid.module.css';

/* ─── Generate glow dot positions scattered across viewport ─── */
function generateGlowDots(count: number) {
    const dots: Array<{ left: string; top: string; delay: string }> = [];
    for (let i = 0; i < count; i++) {
        dots.push({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            delay: `${Math.random() * 6}s`,
        });
    }
    return dots;
}

export function HolographicGrid() {
    const [dots, setDots] = useState<Array<{ left: string; top: string; delay: string }>>([]);

    useEffect(() => {
        setDots(generateGlowDots(80));
    }, []);

    return (
        <div className={styles.gridContainer} aria-hidden="true">
            {/* Breathing wrapper — slow global opacity pulse */}
            <div className={styles.gridBreathing}>
                {/* Layer 1: Ultra-fine micro grid (texture) */}
                <div className={styles.microGrid} />

                {/* Layer 2: Minor structural grid */}
                <div className={styles.minorGrid} />

                {/* Layer 3: Major bold grid lines */}
                <div className={styles.majorGrid} />
            </div>

            {/* Slow hue-cycling color overlay */}
            <div className={styles.colorCycle} />



            {/* Horizontal scan line sweep */}
            <div className={styles.scanLine} />

            {/* Ambient center bloom */}
            <div className={styles.ambientBloom} />

            {/* Intersection glow dots */}
            <div className={styles.glowPoints}>
                {dots.map((dot, i) => (
                    <div
                        key={i}
                        className={styles.glowDot}
                        style={{
                            left: dot.left,
                            top: dot.top,
                            animationDelay: dot.delay,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
