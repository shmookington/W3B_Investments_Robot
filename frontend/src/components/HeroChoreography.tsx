'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HeroChoreography.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero Choreography Protocol — 4-Phase Pinned Sequence
 *
 * Phase 1 — Focus Buffer (0-25%):    Static void. Monolith prominent.
 * Phase 2 — Lift & Glow (25-50%):    Subtle scale + brightness lift.
 * Phase 3 — Narrative Reveal (50-85%): Content reveals via stagger.
 * Phase 4 — Global Exit (85-100%):    Coordinated upward translation + fade.
 */
export function HeroChoreography({ children }: { children: React.ReactNode }) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const monolithRef = useRef<HTMLDivElement>(null);
    const narrativeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sectionRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: '+=350vh',
                    pin: true,
                    scrub: 1.5,
                    toggleActions: 'play none none reverse',
                },
            });

            /* Phase 1 — Focus Buffer (0-25%): Static void, eye lands */
            tl.to({}, { duration: 0.25 });

            /* Phase 2 — Lift & Glow (25-50%): Monolith brightens + lifts */
            if (monolithRef.current) {
                tl.to(
                    monolithRef.current,
                    {
                        scale: 1.02,
                        filter: 'brightness(1.3)',
                        duration: 0.25,
                        ease: 'power2.out',
                    },
                    0.25
                );
            }

            /* Phase 3 — Narrative Reveal (50-85%): Staggered content */
            if (narrativeRef.current) {
                const items = narrativeRef.current.querySelectorAll('[data-scroll-reveal]');
                if (items.length > 0) {
                    tl.fromTo(
                        items,
                        { opacity: 0, y: 30 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.35,
                            stagger: 0.05,
                            ease: 'power2.out',
                        },
                        0.5
                    );
                }
            }

            /* Phase 4 — Global Exit (85-100%): Upward translation + fade */
            tl.to(
                sectionRef.current,
                {
                    y: -60,
                    opacity: 0,
                    duration: 0.15,
                    ease: 'power2.in',
                },
                0.85
            );
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={sectionRef} className={styles.section} style={{ willChange: 'transform, opacity' }}>
            <div ref={monolithRef} className={styles.monolithWrapper} style={{ willChange: 'transform, filter' }}>
                {/* The MonolithHero goes here */}
            </div>
            <div ref={narrativeRef} className={styles.narrative}>
                {children}
            </div>
        </div>
    );
}
