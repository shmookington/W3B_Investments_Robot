import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent, analytics } from '@/lib/analytics';

describe('analytics', () => {
    beforeEach(() => {
        // Reset plausible mock
        (window as unknown as Record<string, unknown>).plausible = undefined;
    });

    it('no-ops when plausible is not loaded', () => {
        // Should not throw
        expect(() => trackEvent('test')).not.toThrow();
    });

    it('calls plausible when loaded', () => {
        const mock = vi.fn();
        (window as unknown as Record<string, unknown>).plausible = mock;
        trackEvent('test_event', { key: 'val' });
        expect(mock).toHaveBeenCalledWith('test_event', { props: { key: 'val' } });
    });

    it('calls plausible without props', () => {
        const mock = vi.fn();
        (window as unknown as Record<string, unknown>).plausible = mock;
        trackEvent('simple');
        expect(mock).toHaveBeenCalledWith('simple', undefined);
    });

    it('analytics.walletConnect sends correct event', () => {
        const mock = vi.fn();
        (window as unknown as Record<string, unknown>).plausible = mock;
        analytics.walletConnect('Base');
        expect(mock).toHaveBeenCalledWith('wallet_connect', { props: { chain: 'Base' } });
    });

    it('analytics.deposit sends correct event', () => {
        const mock = vi.fn();
        (window as unknown as Record<string, unknown>).plausible = mock;
        analytics.deposit('1000', 'USDC');
        expect(mock).toHaveBeenCalledWith('deposit', { props: { amount: '1000', token: 'USDC' } });
    });

    it('analytics.governanceVote sends correct event', () => {
        const mock = vi.fn();
        (window as unknown as Record<string, unknown>).plausible = mock;
        analytics.governanceVote('PROP-42', 'FOR');
        expect(mock).toHaveBeenCalledWith('governance_vote', { props: { proposalId: 'PROP-42', vote: 'FOR' } });
    });
});
