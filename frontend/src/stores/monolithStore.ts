/**
 * MONOLITH Data Cache — Zustand Store
 *
 * Central state for all real-time MONOLITH data streams.
 * Provides optimistic update support for strategy actions.
 */

import { create } from 'zustand';

/* ── Types ─── */

export interface Position { contract: string; event?: string; direction?: 'long' | 'short'; size: number; entryPrice: number; currentPrice: number; pnl: number; }

export interface PortfolioState {
    equity: number;
    totalPnl: number;
    dayPnl: number;
    positions: Position[];
}

export interface RegimeState {
    current: string;
    probabilities: Record<string, number>;
    history: { regime: string; timestamp: number }[];
}

export interface RiskMetric { name: string; value: number; threshold: number; status: 'ok' | 'warning' | 'breach'; }

export interface RiskState {
    critical10: RiskMetric[];
    circuitBreakers: { strategy: string; triggered: boolean; reason?: string }[];
    correlationMatrix: number[][];
}

export interface FeedStatus { name: string; status: 'ok' | 'degraded' | 'down'; latencyMs: number; lastUpdate: number; }

export interface SystemHealthState {
    feeds: FeedStatus[];
    engines: { name: string; status: 'running' | 'stopped' | 'error' }[];
}

export interface MonolithStore {
    portfolio: PortfolioState;
    regime: RegimeState;
    risk: RiskState;
    systemHealth: SystemHealthState;

    // Updaters (called from WS streams)
    setPortfolio: (data: Partial<PortfolioState>) => void;
    setRegime: (data: Partial<RegimeState>) => void;
    setRisk: (data: Partial<RiskState>) => void;
    setSystemHealth: (data: Partial<SystemHealthState>) => void;

    // Optimistic updates
    optimisticPauseStrategy: (name: string) => () => void;
    optimisticResumeStrategy: (name: string) => () => void;
}

/* ── Initial State ─── */

const initialPortfolio: PortfolioState = { equity: 0, totalPnl: 0, dayPnl: 0, positions: [] };
const initialRegime: RegimeState = { current: 'unknown', probabilities: {}, history: [] };
const initialRisk: RiskState = { critical10: [], circuitBreakers: [], correlationMatrix: [] };
const initialHealth: SystemHealthState = { feeds: [], engines: [] };

/* ── Store ─── */

export const useMonolithStore = create<MonolithStore>((set, get) => ({
    portfolio: initialPortfolio,
    regime: initialRegime,
    risk: initialRisk,
    systemHealth: initialHealth,

    setPortfolio: (data) => set((s) => ({ portfolio: { ...s.portfolio, ...data } })),
    setRegime: (data) => set((s) => ({ regime: { ...s.regime, ...data } })),
    setRisk: (data) => set((s) => ({ risk: { ...s.risk, ...data } })),
    setSystemHealth: (data) => set((s) => ({ systemHealth: { ...s.systemHealth, ...data } })),

    optimisticPauseStrategy: (name: string) => {
        const prev = get().risk.circuitBreakers;
        set((s) => ({
            risk: {
                ...s.risk,
                circuitBreakers: s.risk.circuitBreakers.map(cb =>
                    cb.strategy === name ? { ...cb, triggered: true, reason: 'Manual pause' } : cb
                ),
            },
        }));
        // Return revert function
        return () => set((s) => ({ risk: { ...s.risk, circuitBreakers: prev } }));
    },

    optimisticResumeStrategy: (name: string) => {
        const prev = get().risk.circuitBreakers;
        set((s) => ({
            risk: {
                ...s.risk,
                circuitBreakers: s.risk.circuitBreakers.map(cb =>
                    cb.strategy === name ? { ...cb, triggered: false, reason: undefined } : cb
                ),
            },
        }));
        return () => set((s) => ({ risk: { ...s.risk, circuitBreakers: prev } }));
    },
}));
