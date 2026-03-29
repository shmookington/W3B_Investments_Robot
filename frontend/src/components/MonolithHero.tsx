'use client';

import dynamic from 'next/dynamic';
import styles from './MonolithHero.module.css';

/**
 * Lazy-load the 3D scene so Three.js doesn't block initial page load.
 * Falls back to a CSS-only version on mobile or SSR.
 */
const MonolithScene = dynamic(
    () => import('./MonolithScene').then((mod) => ({ default: mod.MonolithScene })),
    {
        ssr: false,
        loading: () => <div className={styles.fallback}><div className={styles.fallbackMonolith} /></div>,
    }
);

export function MonolithHero() {
    return (
        <section className={styles.hero}>
            {/* CSS fallback visible on mobile, 3D scene on desktop */}
            <div className={styles.scene}>
                <MonolithScene />
            </div>

            {/* Mobile-only CSS fallback */}
            <div className={styles.mobileFallback}>
                <div className={styles.fallbackGlow} />
                <div className={styles.fallbackMonolith} />
            </div>
        </section>
    );
}
