'use client';

import type { ReactNode } from 'react';

/* ─── HoloChart — Chart wrapper with holographic styling ─── */
interface HoloChartProps {
    children: ReactNode;
    className?: string;
}

/**
 * Wraps any chart library (Recharts, Chart.js, etc.) with holographic styling.
 * Sets transparent background so the grid shows through.
 */
export function HoloChart({ children, className = '' }: HoloChartProps) {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                background: 'transparent',
                borderRadius: 0,
            }}
        >
            {children}
        </div>
    );
}

/**
 * Standard holographic chart color configuration.
 * Use these when configuring your chart library.
 */
export const HOLO_CHART_COLORS = {
    /** Primary data line */
    primary: '#00ff41',
    /** Secondary data line */
    secondary: '#00f0ff',
    /** Tertiary */
    tertiary: '#7b2fff',
    /** Warning line */
    warning: '#ffb300',
    /** Danger line */
    danger: '#ff3b3b',
    /** Chart grid lines */
    gridLine: 'rgba(0, 240, 255, 0.08)',
    /** Chart axis labels */
    axisLabel: 'rgba(224, 224, 232, 0.5)',
    /** Fill gradient start (from line color) */
    fillOpacity: 0.15,
    /** Tooltip background */
    tooltipBg: 'rgba(13, 17, 23, 0.95)',
    /** Tooltip border */
    tooltipBorder: 'rgba(0, 240, 255, 0.25)',
} as const;
