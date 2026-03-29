'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AnimatedNumberOptions {
    /** Duration of count animation in ms (default: 800) */
    duration?: number;
    /** Number of decimal places (default: auto-detect) */
    decimals?: number;
    /** Prefix (e.g., '$') */
    prefix?: string;
    /** Suffix (e.g., '%') */
    suffix?: string;
}

/**
 * Animated number transition — counts from previous value to new value.
 * Returns the display string and a flash color class.
 *
 * Features:
 * - Odometer-style count-up/down
 * - Green flash on increase, red flash on decrease
 * - Brightness arrival pulse
 */
export function useAnimatedNumber(
    value: number,
    options: AnimatedNumberOptions = {}
) {
    const { duration = 800, decimals, prefix = '', suffix = '' } = options;
    const [display, setDisplay] = useState(value);
    const [flashClass, setFlashClass] = useState<'up' | 'down' | null>(null);
    const prevRef = useRef(value);
    const frameRef = useRef<number>(0);

    const formatNum = useCallback(
        (n: number) => {
            const d = decimals ?? (String(value).includes('.') ? String(value).split('.')[1]?.length || 2 : 0);
            return `${prefix}${n.toFixed(d)}${suffix}`;
        },
        [value, decimals, prefix, suffix]
    );

    useEffect(() => {
        const prev = prevRef.current;
        if (prev === value) return;

        // Flash direction
        setFlashClass(value > prev ? 'up' : 'down');
        setTimeout(() => setFlashClass(null), 600);

        // Animate count
        const start = performance.now();
        const diff = value - prev;

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(prev + diff * eased);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick);
            }
        };

        frameRef.current = requestAnimationFrame(tick);
        prevRef.current = value;

        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    return {
        /** Formatted display string */
        text: formatNum(display),
        /** Raw interpolated value */
        value: display,
        /** 'up' | 'down' | null — for color flash */
        flashClass,
    };
}
