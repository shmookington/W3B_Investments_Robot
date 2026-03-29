'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import styles from './CRTOverlay.module.css';

/* ─── CRT Preferences Store ─── */
interface CRTState {
    enabled: boolean;
    toggle: () => void;
    setEnabled: (enabled: boolean) => void;
}

export const useCRTStore = create<CRTState>()(
    persist(
        (set) => ({
            enabled: true,
            toggle: () => set((s) => ({ enabled: !s.enabled })),
            setEnabled: (enabled) => set({ enabled }),
        }),
        { name: 'w3b-crt' }
    )
);

/* ─── CRT Overlay Component ─── */
export function CRTOverlay() {
    const { enabled } = useCRTStore();

    if (!enabled) return null;

    return (
        <div className={styles.crtOverlay} aria-hidden="true">
            {/* Scan lines — subtle horizontal lines */}
            <div className={styles.scanLines} />

            {/* Flicker — barely perceptible opacity variation */}
            <div className={styles.flicker} />

            {/* VHS noise grain — very subtle background noise */}
            <div className={styles.noiseGrain} />

            {/* Screen curvature — radial gradient darkening */}
            <div className={styles.curvature} />

            {/* Vignette — darker edges */}
            <div className={styles.vignette} />

            {/* Chromatic aberration — subtle RGB fringing */}
            <div className={styles.chromaticAberration} />
        </div>
    );
}

/* ─── CRT Toggle Button ─── */
export function CRTToggle() {
    const { enabled, toggle } = useCRTStore();

    return (
        <button
            onClick={toggle}
            title={enabled ? 'Disable CRT effects' : 'Enable CRT effects'}
            aria-label={enabled ? 'Disable CRT effects' : 'Enable CRT effects'}
            style={{
                position: 'fixed',
                bottom: '1rem',
                left: '1rem',
                zIndex: 9999,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.3rem 0.6rem',
                background: enabled ? 'rgba(0, 255, 65, 0.08)' : 'rgba(224, 224, 232, 0.05)',
                border: `1px solid ${enabled ? 'rgba(0, 255, 65, 0.25)' : 'rgba(224, 224, 232, 0.15)'}`,
                borderRadius: '2px',
                color: enabled ? '#00ff41' : '#8b8b9e',
                cursor: 'pointer',
                transition: 'all 250ms ease',
            }}
        >
            CRT {enabled ? 'ON' : 'OFF'}
        </button>
    );
}
