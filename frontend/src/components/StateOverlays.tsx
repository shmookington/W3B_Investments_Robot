'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectionState, type WalletPhase, type FeedPhase } from './ConnectionChoreography';
import { springHeavy, springSmooth } from '@/lib/motion';
import styles from './StateOverlays.module.css';

/* ═══════════════════════════════════════════════════
   PANEL WRAPPER — Cinematic power-on/off + feed states
   ═══════════════════════════════════════════════════ */

interface StatePanelProps {
    id: string;
    children: React.ReactNode;
    /** Stagger delay index (for power-on cascade) */
    index?: number;
    className?: string;
}

/**
 * Wraps any panel/card to give it cinematic state transitions:
 * - Pre-connect: muted, shows "AWAITING LINK"
 * - Connecting: pulsing border
 * - Connected: scan-line sweep → content appears
 * - Disconnected: reverse power-down, desaturated
 * - Feed states: degraded borders, static overlay, etc.
 */
export function StatePanel({ id, children, index = 0, className }: StatePanelProps) {
    const { wallet, feed, registerPanel, unregisterPanel } = useConnectionState();
    const [powered, setPowered] = useState(false);
    const [scanDone, setScanDone] = useState(false);

    useEffect(() => {
        registerPanel(id);
        return () => unregisterPanel(id);
    }, [id, registerPanel, unregisterPanel]);

    // Power-on with stagger delay
    useEffect(() => {
        if (wallet === 'connected') {
            const timer = setTimeout(() => {
                setPowered(true);
                // Scan-line sweep
                const scanTimer = setTimeout(() => setScanDone(true), 300);
                return () => clearTimeout(scanTimer);
            }, index * 80);
            return () => clearTimeout(timer);
        } else {
            setPowered(false);
            setScanDone(false);
        }
    }, [wallet, index]);

    const feedClass =
        feed === 'reconnecting' ? styles.feedReconnecting :
            feed === 'disconnected' ? styles.feedDisconnected :
                feed === 'recovered' ? styles.feedRecovered : '';

    return (
        <div
            className={`
        ${styles.panel}
        ${powered ? styles.powered : styles.unpowered}
        ${powered && !scanDone ? styles.scanning : ''}
        ${feedClass}
        ${className || ''}
      `}
        >
            {/* Pre-connect overlay */}
            <AnimatePresence>
                {wallet === 'disconnected' && (
                    <motion.div
                        className={styles.awaitingOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    >
                        <span className={styles.awaitingText}>AWAITING LINK</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Connecting pulse overlay */}
            {wallet === 'connecting' && <div className={styles.connectingPulse} />}

            {/* Feed disconnected — static grain */}
            {feed === 'disconnected' && <div className={styles.staticGrain} />}

            {/* Stale data badge */}
            {feed === 'disconnected' && (
                <div className={styles.staleBadge}>STALE</div>
            )}

            {/* Scan-line sweep on power-on */}
            {powered && !scanDone && <div className={styles.scanLine} />}

            {/* Content */}
            <motion.div
                animate={powered ? { opacity: 1, filter: 'saturate(1) brightness(1)' } : { opacity: 0.4, filter: 'saturate(0.2) brightness(0.6)' }}
                transition={springHeavy}
            >
                {children}
            </motion.div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   WALLET CONNECTION RING
   ═══════════════════════════════════════════════════ */

export function WalletConnectionRing() {
    const { wallet } = useConnectionState();

    return (
        <div className={`${styles.ring} ${wallet === 'connecting' ? styles.ringPulsing : ''} ${wallet === 'connected' ? styles.ringConnected : ''}`} />
    );
}

/* ═══════════════════════════════════════════════════
   FEED STATUS INDICATOR
   ═══════════════════════════════════════════════════ */

export function FeedStatusIndicator() {
    const { feed, feedAttempts } = useConnectionState();

    const color =
        feed === 'connected' || feed === 'recovered' ? 'var(--color-phosphor, #39ff14)' :
            feed === 'reconnecting' ? 'var(--color-warning, #f59e0b)' :
                'var(--color-danger, #ef4444)';

    const label =
        feed === 'connected' ? 'LIVE' :
            feed === 'recovered' ? 'RECOVERED' :
                feed === 'reconnecting' ? `RETRY ${feedAttempts}` :
                    'SIGNAL LOST';

    return (
        <div className={styles.feedIndicator}>
            <div className={`${styles.feedDot} ${feed === 'connected' ? styles.heartbeat : ''}`} style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className={styles.feedLabel} style={{ color }}>{label}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DISCONNECT BANNER
   ═══════════════════════════════════════════════════ */

export function DisconnectBanner() {
    const { wallet } = useConnectionState();

    return (
        <AnimatePresence>
            {wallet === 'disconnected' && (
                <motion.div
                    className={styles.disconnectBanner}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={springSmooth}
                >
                    SIGNAL LOST
                </motion.div>
            )}
        </AnimatePresence>
    );
}
