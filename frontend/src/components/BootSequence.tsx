'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './BootSequence.module.css';

/**
 * Cinematic Boot Sequence — plays on every page load
 *
 * Phase 1: Cyan dot appears (0.5s)
 * Phase 2: Dot expands to horizontal line (0.3s)
 * Phase 3: Line fractures to grid, rushes at camera (0.5s)
 * Phase 4: "M.O.N.O.L.I.T.H." letter reveal (1.0s)
 * Phase 5: Terminal readout flickers (0.8s)
 * Phase 6: Grid settles, content fades in (0.7s)
 * Total: ~4.2s — enough breathing room to absorb every phase
 */
export function BootSequence({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<number>(0);
    const [done, setDone] = useState(false);
    const [skipped, setSkipped] = useState(false);

    useEffect(() => {
        // Reduced motion — skip entirely
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDone(true);
            return;
        }

        // Always play — no sessionStorage gate
        const timers: NodeJS.Timeout[] = [];
        timers.push(setTimeout(() => setPhase(1), 100));   // Dot
        timers.push(setTimeout(() => setPhase(2), 700));   // Line
        timers.push(setTimeout(() => setPhase(3), 1100));  // Grid rush
        timers.push(setTimeout(() => setPhase(4), 1600));  // Letter reveal
        timers.push(setTimeout(() => setPhase(5), 2800));  // Terminal readout (more time to read letters)
        timers.push(setTimeout(() => setPhase(6), 3800));  // Fade out (more time to read terminal)
        timers.push(setTimeout(() => setDone(true), 4500));

        return () => timers.forEach(clearTimeout);
    }, []);

    const handleSkip = useCallback(() => {
        setSkipped(true);
        setDone(true);
    }, []);

    if (done) {
        return <>{children}</>;
    }

    return (
        <>
            <div className={`${styles.overlay} ${skipped ? styles.skipped : ''}`}>
                {/* Phase 1: Cyan dot */}
                <div className={`${styles.dot} ${phase >= 1 ? styles.dotVisible : ''}`} />

                {/* Phase 2: Horizontal line */}
                <div className={`${styles.line} ${phase >= 2 ? styles.lineVisible : ''}`} />

                {/* Phase 3: Grid rush */}
                <div className={`${styles.grid} ${phase >= 3 ? styles.gridVisible : ''}`}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className={styles.gridLine} style={{ '--i': i } as React.CSSProperties} />
                    ))}
                </div>

                {/* Phase 4: Letter reveal */}
                {phase >= 4 && (
                    <div className={styles.title}>
                        {'MONOLITH'.split('').map((char, i) => (
                            <span
                                key={i}
                                className={styles.letter}
                                style={{ animationDelay: `${i * 0.06}s` }}
                            >
                                {char}
                            </span>
                        ))}
                    </div>
                )}

                {/* Phase 5: Terminal readout */}
                {phase >= 5 && (
                    <div className={styles.readout}>
                        <TerminalLine text="SYSTEMS ONLINE. ALL FEEDS NOMINAL." delay={0} />
                    </div>
                )}

                {/* Phase 6: Bloom flash + fade out */}
                <div className={`${styles.bloom} ${phase >= 3 ? styles.bloomFlash : ''}`} />
                <div className={`${styles.fadeOut} ${phase >= 6 ? styles.fadeOutActive : ''}`} />

                {/* Skip button */}
                <button
                    className={`${styles.skip} ${phase >= 1 ? styles.skipVisible : ''}`}
                    onClick={handleSkip}
                >
                    SKIP
                </button>
            </div>
        </>
    );
}

/** Terminal typing effect */
function TerminalLine({ text, delay }: { text: string; delay: number }) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        let i = 0;
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayed(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 40 + Math.random() * 40);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timer);
    }, [text, delay]);

    return (
        <span className={styles.terminal}>
            {'> '}{displayed}<span className={styles.cursor}>▊</span>
        </span>
    );
}
