'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ── Generic SWR-like Cache ─── */

interface CacheEntry<T> { data: T; timestamp: number; }
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, maxAge: number): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAge) { cache.delete(key); return null; }
    return entry.data;
}

function setCache<T>(key: string, data: T) {
    cache.set(key, { data, timestamp: Date.now() });
}

interface UseApiOptions { cacheMs?: number; autoRefreshMs?: number; }

function useApi<T>(url: string, options: UseApiOptions = {}) {
    const { cacheMs = 15_000, autoRefreshMs } = options;
    const [data, setData] = useState<T | null>(() => getCached<T>(url, cacheMs));
    const [loading, setLoading] = useState(!data);
    const [error, setError] = useState<string | null>(null);
    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchData = useCallback(async () => {
        // Check cache first
        const cached = getCached<T>(url, cacheMs);
        if (cached) { setData(cached); setLoading(false); return; }

        setLoading(true);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setCache(url, json);
            setData(json);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fetch failed');
        } finally {
            setLoading(false);
        }
    }, [url, cacheMs]);

    useEffect(() => {
        fetchData();

        if (autoRefreshMs) {
            refreshRef.current = setInterval(fetchData, autoRefreshMs);
            return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
        }
    }, [fetchData, autoRefreshMs]);

    return { data, loading, error, refetch: fetchData };
}

/* ── API Hooks ─── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * useBacktestResults — cached backtest results for a strategy
 * Cache: 15s
 */
export function useBacktestResults(strategyId: string) {
    return useApi<{
        strategyId: string;
        sharpe: number;
        sortino: number;
        maxDrawdown: number;
        calmar: number;
        winRate: number;
        totalTrades: number;
        equityCurve: number[];
        cpcvResults: { fold: number; trainSharpe: number; testSharpe: number }[];
    }>(`${API_BASE}/backtest/${strategyId}`, { cacheMs: 15_000 });
}

/**
 * useTradeHistory — paginated execution log with filters
 * Cache: 15s
 */
export function useTradeHistory(filters?: {
    strategy?: string;
    asset?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}) {
    const params = new URLSearchParams();
    if (filters?.strategy) params.set('strategy', filters.strategy);
    if (filters?.asset) params.set('asset', filters.asset);
    if (filters?.startDate) params.set('start', filters.startDate);
    if (filters?.endDate) params.set('end', filters.endDate);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

    const qs = params.toString();
    return useApi<{
        trades: { id: string; time: string; strategy: string; asset: string; side: 'BUY' | 'SELL'; size: number; price: number; slippage: number; pnl: number }[];
        total: number;
        page: number;
        pageSize: number;
    }>(`${API_BASE}/trades${qs ? `?${qs}` : ''}`, { cacheMs: 15_000 });
}

/**
 * useSignalRegistry — cached signal list with auto-refresh
 * Cache: 30s, auto-refresh every 30s
 */
export function useSignalRegistry() {
    return useApi<{
        signals: { name: string; strategy: string; asset: string; direction: 'LONG' | 'SHORT' | 'FLAT'; confidence: number; timestamp: number }[];
    }>(`${API_BASE}/signals`, { cacheMs: 30_000, autoRefreshMs: 30_000 });
}

/**
 * useTokenPrices — token price data
 * Cache: 30s
 */
export function useTokenPrices(tokens: string[]) {
    return useApi<Record<string, number>>(
        `${API_BASE}/prices?tokens=${tokens.join(',')}`,
        { cacheMs: 30_000 }
    );
}

/**
 * useUserPositions — user position data
 * Cache: 15s
 */
export function useUserPositions(address?: string) {
    return useApi<{
        positions: { asset: string; amount: number; value: number }[];
        totalValue: number;
    }>(
        `${API_BASE}/positions${address ? `?address=${address}` : ''}`,
        { cacheMs: 15_000 }
    );
}
