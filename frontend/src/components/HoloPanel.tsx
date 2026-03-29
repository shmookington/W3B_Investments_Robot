'use client';

import { useRef, useEffect, useCallback, type ReactNode } from 'react';
import styles from './HoloPanel.module.css';

type PanelSize = 'sm' | 'md' | 'lg';
type GlowColor = 'cyan' | 'green' | 'amber' | 'danger';
type PanelDepth = 'foreground' | 'mid' | 'background';

interface HoloPanelProps {
    children: ReactNode;
    /** Optional header label (rendered as HUD-style uppercase) */
    header?: string;
    /** Panel padding size */
    size?: PanelSize;
    /** Glow color accent */
    glow?: GlowColor;
    /** Depth layer: controls blur, border brightness, z-index */
    depth?: PanelDepth;
    /** Use grid-patterned border instead of solid */
    gridBorder?: boolean;
    /** Show holographic shimmer */
    shimmer?: boolean;
    /** Disable mouse-tracking refraction */
    noRefraction?: boolean;
    /** Additional className */
    className?: string;
    /** onClick handler */
    onClick?: () => void;
}

const glowMap: Record<GlowColor, string> = {
    cyan: styles.glowCyan,
    green: styles.glowGreen,
    amber: styles.glowAmber,
    danger: styles.glowDanger,
};

export function HoloPanel({
    children,
    header,
    size = 'md',
    glow,
    depth = 'foreground',
    gridBorder = false,
    shimmer = true,
    noRefraction = false,
    className = '',
    onClick,
}: HoloPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Mouse-tracking for light-catch refraction
    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (noRefraction || !panelRef.current) return;
            const rect = panelRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            panelRef.current.style.setProperty('--mouse-x', `${x}%`);
            panelRef.current.style.setProperty('--mouse-y', `${y}%`);
        },
        [noRefraction]
    );

    useEffect(() => {
        if (noRefraction) return;
        const el = panelRef.current;
        if (!el) return;
        el.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => el.removeEventListener('mousemove', handleMouseMove);
    }, [noRefraction, handleMouseMove]);

    const classes = [
        styles.panel,
        styles[size],
        styles[`depth_${depth}`],
        glow ? glowMap[glow] : '',
        gridBorder ? styles.gridBorder : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div ref={panelRef} className={classes} onClick={onClick} role={onClick ? 'button' : undefined}>
            {/* Corner bracket accents */}
            <span className={`${styles.cornerBottom} ${styles.cornerBL}`} />
            <span className={`${styles.cornerBottom} ${styles.cornerBR}`} />

            {/* Inner radial glow (OLED self-illumination) */}
            <div className={styles.innerGlow} />

            {/* Light-catch refraction highlight */}
            {!noRefraction && <div className={styles.lightCatch} />}

            {/* Holographic shimmer sweep */}
            {shimmer && <div className={styles.shimmer} />}

            {/* Header */}
            {header && <div className={styles.panelHeader}>{header}</div>}

            {/* Content */}
            {children}
        </div>
    );
}
