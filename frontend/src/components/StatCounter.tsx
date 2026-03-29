'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import styles from './StatCounter.module.css';

interface StatCounterProps {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    /** Sparkline data (array of 8-12 values) */
    sparkline?: number[];
}

/**
 * StatCounter — count-up metric with micro-sparkline.
 * Counts from 0 to target value when element enters viewport.
 */
export function StatCounter({ label, value, prefix = '', suffix = '', decimals = 0, sparkline }: StatCounterProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [displayed, setDisplayed] = useState(0);
    const [triggered, setTriggered] = useState(false);

    // Viewport detection — count up once visible
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !triggered) {
                    setTriggered(true);
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [triggered]);

    // Count-up animation
    useEffect(() => {
        if (!triggered) return;
        const duration = 1200;
        const start = performance.now();

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Cubic ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayed(eased * value);

            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, [triggered, value]);

    const formattedValue = `${prefix}${displayed.toFixed(decimals)}${suffix}`;

    return (
        <div ref={ref} className={styles.counter}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{formattedValue}</span>

            {sparkline && sparkline.length > 0 && (
                <MicroSparkline data={sparkline} />
            )}
        </div>
    );
}

/* ─── Micro Sparkline ─── */
function MicroSparkline({ data }: { data: number[] }) {
    const path = useMemo(() => {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const w = 60;
        const h = 16;
        const step = w / (data.length - 1);

        const points = data.map((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / range) * h;
            return `${x},${y}`;
        });

        return `M${points.join(' L')}`;
    }, [data]);

    return (
        <svg className={styles.sparkline} viewBox="0 0 60 16" fill="none">
            <path d={path} stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1" />
        </svg>
    );
}
