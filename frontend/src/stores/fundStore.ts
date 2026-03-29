/**
 * Fund Store — Public-facing fund metrics
 *
 * Central state for fund-level data displayed on public pages:
 * NAV, total return, deposits, P&L, share price, participant count.
 * Populated from /api/vault/stats polling.
 */

import { create } from 'zustand';

export interface FundMetrics {
    nav: number;
    totalReturn: number;
    monthlyReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    winRate: number;
    maxDrawdown: number;
    totalDeposited: number;
    totalWithdrawn: number;
    totalPnl: number;
    sharePrice: number;
    participantCount: number;
    cashReserveRatio: number;
    fundStatus: 'operational' | 'maintenance' | 'paused';
}

interface FundStore {
    metrics: FundMetrics;
    loading: boolean;
    lastUpdated: number | null;

    setMetrics: (data: Partial<FundMetrics>) => void;
    setLoading: (loading: boolean) => void;
    refresh: () => Promise<void>;
}

const initialMetrics: FundMetrics = {
    nav: 0,
    totalReturn: 0,
    monthlyReturn: 0,
    annualizedReturn: 0,
    sharpeRatio: 0,
    winRate: 0,
    maxDrawdown: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalPnl: 0,
    sharePrice: 1.0,
    participantCount: 0,
    cashReserveRatio: 1.0,
    fundStatus: 'operational',
};

export const useFundStore = create<FundStore>((set) => ({
    metrics: initialMetrics,
    loading: true,
    lastUpdated: null,

    setMetrics: (data) =>
        set((s) => ({
            metrics: { ...s.metrics, ...data },
            lastUpdated: Date.now(),
        })),

    setLoading: (loading) => set({ loading }),

    refresh: async () => {
        set({ loading: true });
        try {
            const res = await fetch('/api/vault/stats');
            const json = await res.json();
            if (json.success) {
                const d = json.data;
                set({
                    metrics: {
                        nav: d.tvl ?? 0,
                        totalReturn: d.totalPnl && d.tvl ? (d.totalPnl / d.tvl) * 100 : 0,
                        monthlyReturn: 0, // calculated from snapshots
                        annualizedReturn: d.apy ?? 0,
                        sharpeRatio: d.sharpeRatio ?? 0,
                        winRate: d.winRate ?? 0,
                        maxDrawdown: d.maxDrawdown ?? 0,
                        totalDeposited: d.totalDeposited ?? 0,
                        totalWithdrawn: d.totalWithdrawn ?? 0,
                        totalPnl: d.totalPnl ?? 0,
                        sharePrice: d.sharePrice ?? 1.0,
                        participantCount: d.depositorCount ?? 0,
                        cashReserveRatio: d.reserveRatio ?? 1.0,
                        fundStatus: d.vaultStatus ?? 'operational',
                    },
                    loading: false,
                    lastUpdated: Date.now(),
                });
            }
        } catch {
            set({ loading: false });
        }
    },
}));
