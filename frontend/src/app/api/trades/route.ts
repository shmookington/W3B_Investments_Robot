/**
 * Trades API — Proxies to MONOLITH engine on VPS
 *
 * GET /api/trades
 * Returns: trade history + P&L summary from the live engine
 */
import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${ENGINE_URL}/execution/trades`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeout);

        const data = await res.json();
        const rawTrades = data.trades ?? [];

        // Map engine format → terminal format
        const trades = rawTrades.map((t: Record<string, unknown>) => ({
            id: t.order_id ?? t.id ?? '',
            asset: t.symbol ?? '',
            strategy: t.strategy ?? 'unknown',
            side: t.side ?? 'long',
            entryPrice: t.price ?? t.entry_price ?? 0,
            exitPrice: t.exit_price ?? null,
            size: t.quantity ?? t.size ?? 0,
            pnl: t.pnl ?? null,
            pnlPercent: t.pnl_percent ?? null,
            fees: t.fees ?? t.fees_total ?? 0,
            status: t.exit_price ? 'closed' : 'open',
            timestamp: t.timestamp ?? new Date().toISOString(),
        }));

        // Compute P&L aggregates
        const closedTrades = trades.filter((t: { status: string }) => t.status === 'closed');
        const openPositions = trades.filter((t: { status: string }) => t.status === 'open');
        const realizedPnl = closedTrades.reduce((sum: number, t: { pnl: number | null }) => sum + (t.pnl ?? 0), 0);
        const totalFees = trades.reduce((sum: number, t: { fees: number }) => sum + (t.fees ?? 0), 0);

        return NextResponse.json({
            trades,
            pnl: {
                realizedPnl: Math.round(realizedPnl * 100) / 100,
                totalFees: Math.round(totalFees * 100) / 100,
                closedTrades: closedTrades.length,
                openPositions: openPositions.length,
            },
            totalTrades: trades.length,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({
            trades: [],
            pnl: { realizedPnl: 0, totalFees: 0, closedTrades: 0, openPositions: 0 },
            totalTrades: 0,
            error: msg,
        });
    }
}
