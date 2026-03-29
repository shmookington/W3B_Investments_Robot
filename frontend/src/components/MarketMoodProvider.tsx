'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════
   MARKET MOOD TYPES
   ═══════════════════════════════════════════════════ */

export type VolatilityLevel = 'low' | 'normal' | 'high' | 'extreme';
export type PnLMood = 'positive' | 'negative' | 'neutral' | 'bigWin' | 'bigLoss';

interface MarketMoodState {
    volatility: VolatilityLevel;
    pnlMood: PnLMood;
    circuitBreaker: boolean;
    /** Timestamp of last data arrival (for staleness detection) */
    lastDataAt: number;
}

interface MarketMoodActions {
    setVolatility: (level: VolatilityLevel) => void;
    setPnLMood: (mood: PnLMood) => void;
    triggerCircuitBreaker: () => void;
    clearCircuitBreaker: () => void;
    markDataArrival: () => void;
}

type MarketMoodCtx = MarketMoodState & MarketMoodActions;

const MarketMoodContext = createContext<MarketMoodCtx | null>(null);

export function useMarketMood() {
    const ctx = useContext(MarketMoodContext);
    if (!ctx) throw new Error('useMarketMood must be used within MarketMoodProvider');
    return ctx;
}

/* ═══════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════ */

export function MarketMoodProvider({ children }: { children: ReactNode }) {
    const [volatility, setVolatilityState] = useState<VolatilityLevel>('normal');
    const [pnlMood, setPnLMoodState] = useState<PnLMood>('neutral');
    const [circuitBreaker, setCircuitBreaker] = useState(false);
    const [lastDataAt, setLastDataAt] = useState(Date.now());

    const setVolatility = useCallback((level: VolatilityLevel) => {
        setVolatilityState(level);
        // Apply CSS custom properties to root for ambient layer
        document.documentElement.style.setProperty('--volatility-level', level);
        const speed = level === 'low' ? '0.3' : level === 'normal' ? '0.6' : level === 'high' ? '1.2' : '2.0';
        document.documentElement.style.setProperty('--ambient-speed', speed);
        const glow = level === 'low' ? '0.3' : level === 'normal' ? '0.5' : level === 'high' ? '0.8' : '1.0';
        document.documentElement.style.setProperty('--ambient-glow', glow);
    }, []);

    const setPnLMood = useCallback((mood: PnLMood) => {
        setPnLMoodState(mood);
        // Apply mood tint to root
        const tint =
            mood === 'positive' || mood === 'bigWin' ? 'rgba(57, 255, 20, 0.03)' :
                mood === 'negative' || mood === 'bigLoss' ? 'rgba(239, 68, 68, 0.03)' :
                    'transparent';
        document.documentElement.style.setProperty('--mood-tint', tint);
        document.documentElement.style.setProperty('--mood', mood);
    }, []);

    const triggerCircuitBreaker = useCallback(() => {
        setCircuitBreaker(true);
        // Auto-clear after 5 seconds
        setTimeout(() => setCircuitBreaker(false), 5000);
    }, []);

    const clearCircuitBreaker = useCallback(() => {
        setCircuitBreaker(false);
    }, []);

    const markDataArrival = useCallback(() => {
        setLastDataAt(Date.now());
    }, []);

    return (
        <MarketMoodContext.Provider
            value={{
                volatility, pnlMood, circuitBreaker, lastDataAt,
                setVolatility, setPnLMood, triggerCircuitBreaker, clearCircuitBreaker, markDataArrival,
            }}
        >
            {children}
        </MarketMoodContext.Provider>
    );
}
