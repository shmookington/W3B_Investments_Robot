'use client';

import { useEffect, useState } from 'react';

/**
 * Detects user's reduced motion preference.
 * Returns true if the user prefers reduced motion.
 * Can be overridden with a local toggle.
 */
export function useReducedMotion() {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);

        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return reduced;
}
