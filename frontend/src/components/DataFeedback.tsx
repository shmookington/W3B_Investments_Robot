'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketMood } from './MarketMoodProvider';
import { springElastic, springSmooth } from '@/lib/motion';
import styles from './DataFeedback.module.css';

/* ═══════════════════════════════════════════════════
   VOLATILITY AMBIENT LAYER
   ═══════════════════════════════════════════════════
   Overlays the grid with volatility-responsive effects.
   Driven by CSS custom properties set by MarketMoodProvider.
   ═══════════════════════════════════════════════════ */

export function VolatilityAmbient() {
    const { volatility } = useMarketMood();

    return (
        <div className={`${styles.ambient} ${styles[`vol_${volatility}`]}`} />
    );
}

/* ═══════════════════════════════════════════════════
   P&L MOOD EFFECTS
   ═══════════════════════════════════════════════════ */

export function PnLMoodEffect() {
    const { pnlMood } = useMarketMood();
    const [showAurora, setShowAurora] = useState(false);
    const [showWarningPulse, setShowWarningPulse] = useState(false);

    useEffect(() => {
        if (pnlMood === 'bigWin') {
            setShowAurora(true);
            setTimeout(() => setShowAurora(false), 2000);
        }
        if (pnlMood === 'bigLoss') {
            setShowWarningPulse(true);
            setTimeout(() => setShowWarningPulse(false), 1500);
        }
    }, [pnlMood]);

    return (
        <>
            {/* Aurora effect for big wins */}
            <AnimatePresence>
                {showAurora && (
                    <motion.div
                        className={styles.aurora}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                )}
            </AnimatePresence>

            {/* Warning pulse for big losses */}
            <AnimatePresence>
                {showWarningPulse && (
                    <motion.div
                        className={styles.warningPulse}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

/* ═══════════════════════════════════════════════════
   CIRCUIT BREAKER EMERGENCY OVERLAY
   ═══════════════════════════════════════════════════ */

export function CircuitBreakerOverlay() {
    const { circuitBreaker } = useMarketMood();

    return (
        <AnimatePresence>
            {circuitBreaker && (
                <>
                    {/* Red flash overlay */}
                    <motion.div
                        className={styles.cbFlash}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Emergency banner */}
                    <motion.div
                        className={styles.cbBanner}
                        initial={{ y: -60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -60, opacity: 0 }}
                        transition={springElastic}
                    >
                        ⚠ CIRCUIT BREAKER TRIGGERED — POSITIONING HALTED
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ═══════════════════════════════════════════════════
   DATA ARRIVAL PULSE
   ═══════════════════════════════════════════════════ */

interface DataPulseProps {
    /** Whether new data just arrived */
    fresh?: boolean;
    /** Seconds since last update (for staleness) */
    staleAfter?: number;
    children: React.ReactNode;
    className?: string;
}

/**
 * Wraps any data element to show:
 * - Cyan pulse on fresh data arrival (Geiger counter blip)
 * - Dim + amber border when data goes stale (>30s)
 * - Brightness flash when stale data refreshes
 */
export function DataPulse({ fresh = false, staleAfter = 30, children, className }: DataPulseProps) {
    const [pulsing, setPulsing] = useState(false);
    const [stale, setStale] = useState(false);
    const [waking, setWaking] = useState(false);
    const prevFreshRef = useRef(fresh);
    const staleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fresh data pulse
    useEffect(() => {
        if (fresh && !prevFreshRef.current) {
            // Was stale, now fresh — wake up
            if (stale) {
                setWaking(true);
                setStale(false);
                setTimeout(() => setWaking(false), 400);
            }
            setPulsing(true);
            setTimeout(() => setPulsing(false), 150);
        }
        prevFreshRef.current = fresh;
    }, [fresh, stale]);

    // Staleness timer
    useEffect(() => {
        if (fresh) {
            setStale(false);
            if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
            staleTimerRef.current = setTimeout(() => setStale(true), staleAfter * 1000);
        }
        return () => { if (staleTimerRef.current) clearTimeout(staleTimerRef.current); };
    }, [fresh, staleAfter]);

    return (
        <div
            className={`
        ${styles.dataPulse}
        ${pulsing ? styles.pulsing : ''}
        ${stale ? styles.staleData : ''}
        ${waking ? styles.waking : ''}
        ${className || ''}
      `}
        >
            {children}
        </div>
    );
}
