'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Interpolates 0 → 1 based on how far an element is
 * through the viewport scroll zone.
 *
 * @param options.start - When the element should start (default: 'top 85%' equivalent = 0.85)
 * @param options.end   - When the element should finish (default: 'top 20%' equivalent = 0.2)
 *
 * Returns: { ref, progress }
 *   - ref: attach to the target element
 *   - progress: 0 (not in view) → 1 (fully scrolled through)
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(options?: {
    start?: number;
    end?: number;
}) {
    const { start = 0.85, end = 0.2 } = options || {};
    const ref = useRef<T>(null);
    const [progress, setProgress] = useState(0);

    const handleScroll = useCallback(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const vh = window.innerHeight;

        // Element top position as fraction of viewport (1 = bottom, 0 = top)
        const elementTop = rect.top / vh;

        // Map element position to 0→1 progress between start and end thresholds
        const raw = (start - elementTop) / (start - end);
        const clamped = Math.min(1, Math.max(0, raw));

        setProgress(clamped);
    }, [start, end]);

    useEffect(() => {
        // Use passive scroll listener for performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return { ref, progress };
}
