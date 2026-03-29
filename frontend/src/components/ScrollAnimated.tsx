'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════
   ANIMATION PRESETS
   ═══════════════════════════════════════════════════ */
const PRESETS = {
    fadeUp: {
        from: { opacity: 0, y: 40 },
        to: { opacity: 1, y: 0, ease: 'power2.out' },
    },
    scaleUp: {
        from: { opacity: 0, scale: 0.92 },
        to: { opacity: 1, scale: 1, ease: 'power2.out' },
    },
    slideLeft: {
        from: { opacity: 0, x: 60 },
        to: { opacity: 1, x: 0, ease: 'power2.out' },
    },
    slideRight: {
        from: { opacity: 0, x: -60 },
        to: { opacity: 1, x: 0, ease: 'power2.out' },
    },
    rotateIn: {
        from: { opacity: 0, rotateY: 15 },
        to: { opacity: 1, rotateY: 0, ease: 'power2.out' },
    },
    ctaSnap: {
        from: { opacity: 0, y: 30, scale: 0.95 },
        to: { opacity: 1, y: 0, scale: 1, ease: 'back.out(1.5)' },
    },
} as const;

type Preset = keyof typeof PRESETS;

interface ScrollAnimatedProps {
    children: React.ReactNode;
    preset?: Preset;
    /** Scrub to scroll position (default: 1 for tighter response) */
    scrub?: number | boolean;
    /** ScrollTrigger start (default: 'top 85%') */
    start?: string;
    /** ScrollTrigger end (default: 'top 30%') */
    end?: string;
    /** Delay in seconds (useful for staggering manually) */
    delay?: number;
    /** Duration override */
    duration?: number;
    className?: string;
}

/**
 * Element-level scroll-triggered animation.
 * Wraps children with GSAP ScrollTrigger + preset animations.
 * Fully reversible — scrolling up undoes the animation.
 */
export function ScrollAnimated({
    children,
    preset = 'fadeUp',
    scrub = 1,
    start = 'top 85%',
    end = 'top 30%',
    delay = 0,
    duration,
    className,
}: ScrollAnimatedProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const { from, to } = PRESETS[preset];

        const ctx = gsap.context(() => {
            gsap.fromTo(ref.current, from, {
                ...to,
                delay,
                duration: duration || undefined,
                scrollTrigger: {
                    trigger: ref.current,
                    start,
                    end,
                    scrub,
                    toggleActions: 'play none none reverse',
                },
            });
        }, ref);

        return () => ctx.revert();
    }, [preset, scrub, start, end, delay, duration]);

    return (
        <div ref={ref} className={className} style={{ willChange: 'transform, opacity' }}>
            {children}
        </div>
    );
}
