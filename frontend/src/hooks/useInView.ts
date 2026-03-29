'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface InViewOptions {
    /** Trigger threshold (0-1, default: 0.15) */
    threshold?: number;
    /** Only trigger once (default: true) */
    once?: boolean;
    /** Root margin (default: '0px') */
    rootMargin?: string;
}

/**
 * Intersection Observer hook for scroll-triggered animations.
 * Returns a ref and whether the element is in view.
 * By default triggers only once (no repeat).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
    options: InViewOptions = {}
) {
    const { threshold = 0.15, once = true, rootMargin = '0px' } = options;
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    const handleIntersect = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const entry = entries[0];
            if (entry?.isIntersecting) {
                setInView(true);
            } else if (!once) {
                setInView(false);
            }
        },
        [once]
    );

    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(handleIntersect, {
            threshold,
            rootMargin,
        });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [threshold, rootMargin, handleIntersect]);

    return { ref, inView };
}
