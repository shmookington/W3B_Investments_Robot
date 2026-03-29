import { describe, it, expect } from 'vitest';
import { useMonolithStore } from '@/stores/monolithStore';

describe('monolithStore', () => {
    it('has correct initial portfolio state', () => {
        const state = useMonolithStore.getState();
        expect(state.portfolio.equity).toBe(0);
        expect(state.portfolio.totalPnl).toBe(0);
        expect(state.portfolio.positions).toEqual([]);
    });

    it('updates portfolio state', () => {
        useMonolithStore.getState().setPortfolio({ equity: 100000, dayPnl: 500 });
        const state = useMonolithStore.getState();
        expect(state.portfolio.equity).toBe(100000);
        expect(state.portfolio.dayPnl).toBe(500);
    });

    it('updates regime state', () => {
        useMonolithStore.getState().setRegime({ current: 'bull', probabilities: { bull: 0.7, range: 0.2, bear: 0.1 } });
        const state = useMonolithStore.getState();
        expect(state.regime.current).toBe('bull');
        expect(state.regime.probabilities.bull).toBe(0.7);
    });

    it('updates risk state', () => {
        useMonolithStore.getState().setRisk({ critical10: [{ name: 'VaR', value: 0.05, threshold: 0.1, status: 'ok' }] });
        const state = useMonolithStore.getState();
        expect(state.risk.critical10).toHaveLength(1);
        expect(state.risk.critical10[0].name).toBe('VaR');
    });

    it('updates system health state', () => {
        useMonolithStore.getState().setSystemHealth({
            feeds: [{ name: 'Binance', status: 'ok', latencyMs: 12, lastUpdate: Date.now() }],
        });
        const state = useMonolithStore.getState();
        expect(state.systemHealth.feeds).toHaveLength(1);
        expect(state.systemHealth.feeds[0].name).toBe('Binance');
    });

    it('optimistic pause returns revert function', () => {
        const store = useMonolithStore.getState();
        store.setRisk({
            circuitBreakers: [{ strategy: 'MomentumAlpha', triggered: false }],
        });

        const revert = store.optimisticPauseStrategy('MomentumAlpha');
        const paused = useMonolithStore.getState();
        expect(paused.risk.circuitBreakers[0].triggered).toBe(true);

        // Revert
        revert();
        const reverted = useMonolithStore.getState();
        expect(reverted.risk.circuitBreakers[0].triggered).toBe(false);
    });
});
