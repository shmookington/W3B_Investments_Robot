'use client';

import { useEffect } from 'react';
import { initSmoothScroll, destroySmoothScroll, getLenis, smoothScrollTo } from '@/lib/smoothScroll';

/**
 * React hook for Lenis smooth scroll.
 * Initializes on mount, cleans up on unmount.
 * Returns helpers for programmatic scrolling.
 */
export function useSmoothScroll() {
    useEffect(() => {
        const lenis = initSmoothScroll();

        // Disable native CSS smooth-scroll (Lenis overrides it)
        document.documentElement.style.scrollBehavior = 'auto';

        return () => {
            destroySmoothScroll();
            document.documentElement.style.scrollBehavior = '';
        };
    }, []);

    return {
        /** Get the Lenis instance for advanced usage */
        getLenis,
        /** Smooth-scroll to a target */
        scrollTo: smoothScrollTo,
    };
}
