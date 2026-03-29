/**
 * Performance Store — Equity curve, monthly returns, and track record data.
 *
 * Populated from /api/performance/equity and /api/performance/monthly endpoints.
 * Used by: EquityCurve, MonthlyReturnsTable, FundPerformanceCard, Track Record page.
 */

import { create } from 'zustand';

export interface EquityDataPoint {
    date: string;
    nav: number;
}

export interface MonthlyReturnData {
    /** year → month returns (0-indexed, Jan=0) */
    [year: number]: (number | null)[];
}

interface PerformanceStore {
    equityCurve: EquityDataPoint[];
    monthlyReturns: MonthlyReturnData;
    loading: boolean;
    lastUpdated: number | null;

    setEquityCurve: (data: EquityDataPoint[]) => void;
    setMonthlyReturns: (data: MonthlyReturnData) => void;
    setLoading: (loading: boolean) => void;
    refresh: () => Promise<void>;
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
    equityCurve: [],
    monthlyReturns: {},
    loading: true,
    lastUpdated: null,

    setEquityCurve: (data) => set({ equityCurve: data, lastUpdated: Date.now() }),
    setMonthlyReturns: (data) => set({ monthlyReturns: data, lastUpdated: Date.now() }),
    setLoading: (loading) => set({ loading }),

    refresh: async () => {
        set({ loading: true });
        try {
            const [eqRes, moRes] = await Promise.all([
                fetch('/api/performance/equity'),
                fetch('/api/performance/monthly'),
            ]);
            const [eqJson, moJson] = await Promise.all([eqRes.json(), moRes.json()]);

            if (eqJson.success) {
                set({ equityCurve: eqJson.data ?? [] });
            }
            if (moJson.success) {
                set({ monthlyReturns: moJson.data ?? {} });
            }
        } catch {
            // silent fail — UI shows empty state
        } finally {
            set({ loading: false, lastUpdated: Date.now() });
        }
    },
}));
