'use client';

import { useState, useEffect, type ReactNode } from 'react';
import styles from './TerminalGrid.module.css';

type LayoutPreset = 'ops' | 'risk' | 'alpha';

interface GridConfig {
    id: string;
    col: number; row: number;
    colSpan: number; rowSpan: number;
}

const PRESETS: Record<LayoutPreset, GridConfig[]> = {
    ops: [
        { id: 'equity', col: 1, row: 1, colSpan: 3, rowSpan: 1 },
        { id: 'strategies', col: 1, row: 2, colSpan: 2, rowSpan: 2 },
        { id: 'risk', col: 3, row: 2, colSpan: 1, rowSpan: 1 },
        { id: 'trades', col: 3, row: 3, colSpan: 1, rowSpan: 1 },
    ],
    risk: [
        { id: 'risk', col: 1, row: 1, colSpan: 2, rowSpan: 2 },
        { id: 'correlation', col: 3, row: 1, colSpan: 1, rowSpan: 1 },
        { id: 'drawdown', col: 3, row: 2, colSpan: 1, rowSpan: 1 },
        { id: 'breakers', col: 1, row: 3, colSpan: 3, rowSpan: 1 },
    ],
    alpha: [
        { id: 'signals', col: 1, row: 1, colSpan: 2, rowSpan: 1 },
        { id: 'regime', col: 3, row: 1, colSpan: 1, rowSpan: 1 },
        { id: 'alpha', col: 1, row: 2, colSpan: 3, rowSpan: 2 },
    ],
};

interface Props {
    children: (layout: GridConfig[]) => ReactNode;
}

/**
 * TerminalGrid — full-screen grid layout with presets and localStorage persistence.
 */
export function TerminalGrid({ children }: Props) {
    const [preset, setPreset] = useState<LayoutPreset>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('monolith-layout') as LayoutPreset) || 'ops';
        }
        return 'ops';
    });

    const layout = PRESETS[preset];

    useEffect(() => {
        localStorage.setItem('monolith-layout', preset);
    }, [preset]);

    return (
        <div className={styles.container}>
            {/* Background grid */}
            <div className={styles.gridBg} />

            {/* Particle field */}
            <div className={styles.particles} />

            {/* Preset selector */}
            <div className={styles.presetBar}>
                {(['ops', 'risk', 'alpha'] as const).map(p => (
                    <button
                        key={p}
                        className={`${styles.presetBtn} ${preset === p ? styles.presetActive : ''}`}
                        onClick={() => setPreset(p)}
                    >
                        {p.toUpperCase()} FOCUS
                    </button>
                ))}
            </div>

            {/* Grid layout */}
            <div className={styles.grid}>
                {children(layout)}
            </div>

            {/* Projection lines SVG */}
            <svg className={styles.projectionLines} viewBox="0 0 1200 800">
                <line x1="400" y1="200" x2="800" y2="200" className={styles.projLine} />
                <line x1="400" y1="400" x2="400" y2="600" className={styles.projLine} />
            </svg>
        </div>
    );
}
