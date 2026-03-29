'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════
   AMBIENT ALIVENESS PROTOCOL
   ──────────────────────────────────────────────────
   A dashboard that is "still" is dead. The grid breathes.
   ═══════════════════════════════════════════════════ */

type AlivenessState = 'active' | 'idle' | 'returning' | 'background';

interface AlivenessCtx {
    state: AlivenessState;
    /** Seconds since last interaction */
    idleDuration: number;
    /** Whether tab is visible */
    tabVisible: boolean;
    /** Values that changed while tab was hidden */
    pendingChanges: number;
    /** Queue a data change for flush animation */
    queueChange: () => void;
    /** Flush pending changes (triggers cascade) */
    flushChanges: () => void;
}

const AlivenessContext = createContext<AlivenessCtx | null>(null);

export function useAmbientAliveness() {
    const ctx = useContext(AlivenessContext);
    if (!ctx) throw new Error('useAmbientAliveness must be used within AmbientAlivenessProvider');
    return ctx;
}

const IDLE_THRESHOLD = 10_000; // 10 seconds

export function AmbientAlivenessProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AlivenessState>('active');
    const [idleDuration, setIdleDuration] = useState(0);
    const [tabVisible, setTabVisible] = useState(true);
    const [pendingChanges, setPendingChanges] = useState(0);
    const lastInteractionRef = useRef(Date.now());
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Interaction tracking ──
    const markActive = useCallback(() => {
        const wasIdle = Date.now() - lastInteractionRef.current > IDLE_THRESHOLD;
        lastInteractionRef.current = Date.now();
        setIdleDuration(0);

        if (wasIdle) {
            // Return-from-idle: brief "system acknowledges" flash
            setState('returning');
            document.documentElement.style.setProperty('--grid-flash', '1');
            setTimeout(() => {
                document.documentElement.style.setProperty('--grid-flash', '0');
                setState('active');
            }, 400);
        } else {
            setState('active');
        }
    }, []);

    // Listen for any interaction
    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
        events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
        return () => events.forEach((e) => window.removeEventListener(e, markActive));
    }, [markActive]);

    // Idle polling
    useEffect(() => {
        idleTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - lastInteractionRef.current;
            setIdleDuration(Math.floor(elapsed / 1000));
            if (elapsed > IDLE_THRESHOLD && state === 'active') {
                setState('idle');
                // Slow down grid via CSS custom property
                document.documentElement.style.setProperty('--ambient-mode', 'idle');
            }
        }, 1000);
        return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
    }, [state]);

    // ── Background tab handling ──
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                setTabVisible(false);
                setState('background');
                document.documentElement.style.setProperty('--ambient-mode', 'background');
            } else {
                setTabVisible(true);
                markActive();
                document.documentElement.style.setProperty('--ambient-mode', 'active');
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [markActive]);

    const queueChange = useCallback(() => {
        setPendingChanges((p) => p + 1);
    }, []);

    const flushChanges = useCallback(() => {
        setPendingChanges(0);
    }, []);

    return (
        <AlivenessContext.Provider
            value={{ state, idleDuration, tabVisible, pendingChanges, queueChange, flushChanges }}
        >
            {children}
        </AlivenessContext.Provider>
    );
}
