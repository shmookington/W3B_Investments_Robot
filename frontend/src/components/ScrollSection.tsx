'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './ScrollSection.module.css';

gsap.registerPlugin(ScrollTrigger);

interface ScrollSectionProps {
    children: React.ReactNode;
    /** Scroll duration as viewport heights (default: 300vh) */
    duration?: number;
    /** Scrub damping (default: 1.5 for weighted feel) */
    scrub?: number;
    /** Pin the section during scroll (default: true) */
    pin?: boolean;
    /** Unique id for ScrollTrigger targeting */
    id?: string;
    className?: string;
}

/**
 * Pinned section orchestrator for scroll-scrubbed cinematic sequences.
 * Wraps children in a GSAP ScrollTrigger context with pinning,
 * extended scroll duration, and 1:1 reversibility.
 */
export function ScrollSection({
    children,
    duration = 300,
    scrub = 1.5,
    pin = true,
    id,
    className,
}: ScrollSectionProps) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!triggerRef.current || !contentRef.current) return;

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: triggerRef.current,
                start: 'top top',
                end: `+=${duration}vh`,
                pin,
                scrub,
                id: id || undefined,
                // 1:1 reversibility — scrolling up undoes the narrative
                toggleActions: 'play none none reverse',
            });
        }, triggerRef);

        return () => ctx.revert();
    }, [duration, scrub, pin, id]);

    return (
        <div ref={triggerRef} className={`${styles.scrollSection} ${className || ''}`}>
            <div ref={contentRef} className={styles.content} style={{ willChange: 'transform' }}>
                {children}
            </div>
        </div>
    );
}
