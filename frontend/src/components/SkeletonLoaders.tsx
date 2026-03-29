'use client';

import styles from './SkeletonLoaders.module.css';

/**
 * Skeleton loader components with CRT scan-line shimmer.
 * Never show a blank area — always show skeletons.
 */

export function SkeletonLine({ width = '100%', height = '12px' }: { width?: string; height?: string }) {
    return <div className={styles.line} style={{ width, height }} />;
}

export function SkeletonChart({ height = '200px' }: { height?: string }) {
    return (
        <div className={styles.chart} style={{ height }}>
            {/* Placeholder wave line */}
            <svg viewBox="0 0 400 100" className={styles.chartWave}>
                <path
                    d="M0,50 Q50,20 100,50 T200,50 T300,50 T400,50"
                    fill="none" stroke="rgba(0,240,255,0.08)" strokeWidth="2"
                    className={styles.wavePath}
                />
            </svg>
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className={styles.table}>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className={styles.tableRow} style={{ animationDelay: `${r * 100}ms` }}>
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className={styles.tableCell} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonGauge({ size = 80 }: { size?: number }) {
    return <div className={styles.gauge} style={{ width: size, height: size }} />;
}

/** Global loading bar — thin green line at page top */
export function LoadingBar({ active }: { active: boolean }) {
    if (!active) return null;
    return <div className={styles.loadingBar} />;
}
