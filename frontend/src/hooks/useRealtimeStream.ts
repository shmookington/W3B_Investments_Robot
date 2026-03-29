/**
 * useRealtimeStream — React hook for W3B real-time SSE data
 *
 * Connects to /api/stream and pushes events to subscribers.
 * Auto-reconnects on disconnect with exponential backoff.
 *
 * Usage:
 *   const { tvl, pnl, trades, equity, connected } = useRealtimeStream();
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Event types ─── */
export interface TvlUpdate {
    tvl: number;
    delta: number;
    depositorCount: number;
}

export interface PnlUpdate {
    dailyPnl: number;
    dailyPnlPercent: number;
    unrealizedPnl: number;
    openPositions: number;
}

export interface TradeEvent {
    id: string;
    asset: string;
    strategy: string;
    side: 'long' | 'short';
    size: number;
    pnl: number;
    pnlPercent: number;
    txHash: string;
}

export interface EquityTick {
    value: number;
    change: number;
}

export interface StreamState {
    connected: boolean;
    tvl: TvlUpdate | null;
    pnl: PnlUpdate | null;
    trades: TradeEvent[];
    equity: EquityTick[];
    lastHeartbeat: string | null;
}

const MAX_TRADES = 50;
const MAX_EQUITY_TICKS = 200;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export function useRealtimeStream(enabled = true): StreamState {
    const [connected, setConnected] = useState(false);
    const [tvl, setTvl] = useState<TvlUpdate | null>(null);
    const [pnl, setPnl] = useState<PnlUpdate | null>(null);
    const [trades, setTrades] = useState<TradeEvent[]>([]);
    const [equity, setEquity] = useState<EquityTick[]>([]);
    const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
    const retriesRef = useRef(0);
    const sourceRef = useRef<EventSource | null>(null);

    const connect = useCallback(() => {
        if (!enabled || typeof window === 'undefined') return;

        // Don't re-create if already connected
        if (sourceRef.current?.readyState === EventSource.OPEN) return;

        const es = new EventSource('/api/stream?stream=true');
        sourceRef.current = es;

        es.onopen = () => {
            setConnected(true);
            retriesRef.current = 0;
        };

        es.onerror = () => {
            setConnected(false);
            es.close();
            sourceRef.current = null;

            // Exponential backoff reconnect
            const delay = Math.min(
                RECONNECT_BASE_MS * Math.pow(2, retriesRef.current),
                RECONNECT_MAX_MS
            );
            retriesRef.current++;
            setTimeout(connect, delay);
        };

        /* ─── Event handlers ─── */
        es.addEventListener('tvl_update', (e: MessageEvent) => {
            try {
                const parsed = JSON.parse(e.data);
                setTvl(parsed.data);
            } catch { /* skip malformed */ }
        });

        es.addEventListener('pnl_update', (e: MessageEvent) => {
            try {
                const parsed = JSON.parse(e.data);
                setPnl(parsed.data);
            } catch { /* skip */ }
        });

        es.addEventListener('trade', (e: MessageEvent) => {
            try {
                const parsed = JSON.parse(e.data);
                setTrades(prev => [parsed.data, ...prev].slice(0, MAX_TRADES));
            } catch { /* skip */ }
        });

        es.addEventListener('equity_tick', (e: MessageEvent) => {
            try {
                const parsed = JSON.parse(e.data);
                setEquity(prev => [...prev, parsed.data].slice(-MAX_EQUITY_TICKS));
            } catch { /* skip */ }
        });

        es.addEventListener('heartbeat', (e: MessageEvent) => {
            try {
                const parsed = JSON.parse(e.data);
                setLastHeartbeat(parsed.timestamp);
            } catch { /* skip */ }
        });
    }, [enabled]);

    useEffect(() => {
        connect();
        return () => {
            sourceRef.current?.close();
            sourceRef.current = null;
        };
    }, [connect]);

    return { connected, tvl, pnl, trades, equity, lastHeartbeat };
}
