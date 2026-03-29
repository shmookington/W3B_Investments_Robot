'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './CustomCursor.module.css';

type CursorMode = 'default' | 'interactive' | 'chart' | 'loading';

/**
 * Custom Cursor System
 *
 * - Default: thin cyan crosshair (20px) with dot center
 * - Interactive hover: expands to 40px circle with label
 * - Chart hover: vertical data-reading line
 * - Smooth 80ms lerp follow
 * - Trail: 3 fading copies behind cursor
 * - Velocity tracking: faster movement → trail extends, glow increases
 * - Magnetic pull toward interactive elements
 * - Disabled on mobile / touch
 */
export function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const trailRefs = useRef<HTMLDivElement[]>([]);
    const posRef = useRef({ x: -100, y: -100 });
    const targetRef = useRef({ x: -100, y: -100 });
    const velocityRef = useRef(0);
    const [mode, setMode] = useState<CursorMode>('default');
    const [label, setLabel] = useState('');
    const [clicked, setClicked] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [isMobile, setIsMobile] = useState(true);

    // Detect mobile / touch
    useEffect(() => {
        const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
        setIsMobile(!hasFinePointer);
        if (!hasFinePointer) return;

        // Hide native cursor
        document.documentElement.classList.add(styles.hideCursor);
        return () => document.documentElement.classList.remove(styles.hideCursor);
    }, []);

    // Mouse move handler
    const handleMouseMove = useCallback((e: MouseEvent) => {
        targetRef.current = { x: e.clientX, y: e.clientY };

        // Check for interactive elements under cursor
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el) return;

        const interactive = el.closest('button, a, [role="button"], input, select, textarea, [data-cursor="interactive"]');
        const chart = el.closest('[data-cursor="chart"]');

        if (chart) {
            setMode('chart');
            setLabel('');
        } else if (interactive) {
            setMode('interactive');
            const cursorLabel = interactive.getAttribute('data-cursor-label') || '';
            setLabel(cursorLabel);
        } else {
            setMode('default');
            setLabel('');
        }
    }, []);

    // Click feedback
    const handleClick = useCallback(() => {
        setClicked(true);
        setTimeout(() => setClicked(false), 200);
    }, []);

    // Hide when leaving window
    const handleLeave = useCallback(() => setHidden(true), []);
    const handleEnter = useCallback(() => setHidden(false), []);

    // Event listeners
    useEffect(() => {
        if (isMobile) return;

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('click', handleClick);
        document.addEventListener('mouseleave', handleLeave);
        document.addEventListener('mouseenter', handleEnter);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
            document.removeEventListener('mouseleave', handleLeave);
            document.removeEventListener('mouseenter', handleEnter);
        };
    }, [isMobile, handleMouseMove, handleClick, handleLeave, handleEnter]);

    // Animation loop: 80ms lerp + velocity tracking + trail
    useEffect(() => {
        if (isMobile) return;

        let animId: number;
        const LERP = 0.12; // ~80ms at 60fps
        const TRAIL_LERP = [0.08, 0.05, 0.03]; // Progressively slower trails
        const trailPositions = [
            { x: -100, y: -100 },
            { x: -100, y: -100 },
            { x: -100, y: -100 },
        ];

        const tick = () => {
            const { x: tx, y: ty } = targetRef.current;
            const pos = posRef.current;

            // Main cursor lerp
            const dx = tx - pos.x;
            const dy = ty - pos.y;
            pos.x += dx * LERP;
            pos.y += dy * LERP;

            // Velocity (px/frame)
            const vel = Math.sqrt(dx * dx + dy * dy);
            velocityRef.current = vel;

            // Update main cursor position
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
                // Velocity-driven glow
                const glowIntensity = Math.min(1, vel / 30);
                cursorRef.current.style.setProperty('--velocity-glow', `${glowIntensity}`);
            }

            // Update trails
            trailPositions.forEach((tp, i) => {
                const prevPos = i === 0 ? pos : trailPositions[i - 1];
                tp.x += (prevPos.x - tp.x) * TRAIL_LERP[i];
                tp.y += (prevPos.y - tp.y) * TRAIL_LERP[i];

                if (trailRefs.current[i]) {
                    trailRefs.current[i].style.transform = `translate(${tp.x}px, ${tp.y}px)`;
                    // Trail extends with velocity
                    const trailScale = 1 + Math.min(0.5, vel / 60);
                    trailRefs.current[i].style.setProperty('--trail-scale', `${trailScale}`);
                }
            });

            animId = requestAnimationFrame(tick);
        };

        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [isMobile]);

    if (isMobile) return null;

    return (
        <>
            {/* Trail copies (behind cursor) */}
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    ref={(el) => { if (el) trailRefs.current[i] = el; }}
                    className={styles.trail}
                    style={{ opacity: 0.1 - i * 0.03 }}
                />
            ))}

            {/* Main cursor */}
            <div
                ref={cursorRef}
                className={`
          ${styles.cursor}
          ${styles[mode]}
          ${clicked ? styles.clicked : ''}
          ${hidden ? styles.hidden : ''}
        `}
            >
                {mode === 'interactive' && label && (
                    <span className={styles.label}>{label}</span>
                )}
            </div>
        </>
    );
}
