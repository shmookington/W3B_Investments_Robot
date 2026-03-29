'use client';

import { useEffect } from 'react';
import { getWSManager } from '@/lib/websocket';
import { useMonolithStore } from '@/stores/monolithStore';

/**
 * usePortfolioStream — real-time P&L, equity, positions
 */
export function usePortfolioStream() {
    const { portfolio, setPortfolio } = useMonolithStore();

    useEffect(() => {
        const ws = getWSManager();
        ws.connect();
        const unsub = ws.subscribe('portfolio', (data) => {
            setPortfolio(data as Partial<typeof portfolio>);
        });
        return unsub;
    }, [setPortfolio, portfolio]);

    return portfolio;
}

/**
 * useTradeStream — live trade feed
 */
export function useTradeStream() {
    const { portfolio } = useMonolithStore();

    useEffect(() => {
        const ws = getWSManager();
        ws.connect();
        const unsub = ws.subscribe('trades', () => {
            // Trades are handled via portfolio updates or dedicated trade log
        });
        return unsub;
    }, []);

    return portfolio.positions;
}

/**
 * useRegimeStream — current regime + probabilities
 */
export function useRegimeStream() {
    const { regime, setRegime } = useMonolithStore();

    useEffect(() => {
        const ws = getWSManager();
        ws.connect();
        const unsub = ws.subscribe('regime', (data) => {
            setRegime(data as Partial<typeof regime>);
        });
        return unsub;
    }, [setRegime, regime]);

    return regime;
}

/**
 * useRiskStream — Critical 10 metrics, circuit breaker status
 */
export function useRiskStream() {
    const { risk, setRisk } = useMonolithStore();

    useEffect(() => {
        const ws = getWSManager();
        ws.connect();
        const unsub = ws.subscribe('risk', (data) => {
            setRisk(data as Partial<typeof risk>);
        });
        return unsub;
    }, [setRisk, risk]);

    return risk;
}

/**
 * useDataHealthStream — feed statuses, latency, staleness
 */
export function useDataHealthStream() {
    const { systemHealth, setSystemHealth } = useMonolithStore();

    useEffect(() => {
        const ws = getWSManager();
        ws.connect();
        const unsub = ws.subscribe('data_health', (data) => {
            setSystemHealth(data as Partial<typeof systemHealth>);
        });
        return unsub;
    }, [setSystemHealth, systemHealth]);

    return systemHealth;
}

/**
 * useExecutionStream — fills, slippage, venue performance
 */
export function useExecutionStream() {
    const { portfolio } = useMonolithStore();

    useEffect(() => {
        const ws = getWSManager();
        ws.connect();
        const unsub = ws.subscribe('execution', () => {
            // Execution data flows through portfolio updates
        });
        return unsub;
    }, []);

    return portfolio;
}
