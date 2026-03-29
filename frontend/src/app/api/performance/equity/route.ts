/**
 * Performance Equity Curve API — LIVE DATA
 *
 * GET /api/performance/equity?range=90D
 * Returns: real equity curve from VaultSnapshot + TradeRecord data
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type TimeRange = '30D' | '90D' | '180D' | '1Y' | 'ALL';

const RANGE_DAYS: Record<TimeRange, number> = {
    '30D': 30,
    '90D': 90,
    '180D': 180,
    '1Y': 365,
    'ALL': 9999,
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || '90D') as TimeRange;

    if (!RANGE_DAYS[range]) {
        return NextResponse.json(
            { success: false, error: `Invalid range. Use: ${Object.keys(RANGE_DAYS).join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const days = RANGE_DAYS[range];
        const cutoff = new Date(Date.now() - days * 86_400_000);

        // ── Try VaultSnapshot first ──
        const snapshots = await prisma.vaultSnapshot.findMany({
            where: days < 9999 ? { timestamp: { gte: cutoff } } : {},
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true, tvl: true, sharePrice: true },
        });

        if (snapshots.length > 0) {
            const startValue = snapshots[0].sharePrice;
            const endValue = snapshots[snapshots.length - 1].sharePrice;

            const points = snapshots.map(s => ({
                date: s.timestamp.toISOString().split('T')[0],
                value: Math.round(s.sharePrice * 10000) / 10000,
                drawdown: 0, // Could compute from share price peak
            }));

            return NextResponse.json({
                success: true,
                data: {
                    range,
                    points,
                    startValue: Math.round(startValue * 10000) / 10000,
                    endValue: Math.round(endValue * 10000) / 10000,
                    totalReturn: Math.round(((endValue / startValue - 1) * 100) * 100) / 100,
                },
                meta: { source: 'prisma-live', cached: false },
            });
        }

        // ── Fallback: build equity curve from trade P&L ──
        const trades = await prisma.tradeRecord.findMany({
            where: {
                status: 'closed',
                ...(days < 9999 ? { exitTime: { gte: cutoff } } : {}),
            },
            orderBy: { exitTime: 'asc' },
            select: { exitTime: true, pnl: true },
        });

        if (trades.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    range,
                    points: [],
                    startValue: 0,
                    endValue: 0,
                    totalReturn: 0,
                    message: 'No trade data yet — paper trading just started',
                },
                meta: { source: 'prisma-live', cached: false },
            });
        }

        // Cumulative P&L curve
        let cumPnl = 0;
        let peak = 0;
        const points = trades.map(t => {
            cumPnl += (t.pnl ?? 0);
            peak = Math.max(peak, cumPnl);
            const dd = peak > 0 ? ((cumPnl - peak) / peak) * 100 : 0;
            return {
                date: t.exitTime?.toISOString().split('T')[0] ?? '',
                value: Math.round(cumPnl * 100) / 100,
                drawdown: Math.round(dd * 100) / 100,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                range,
                points,
                startValue: 0,
                endValue: points[points.length - 1]?.value ?? 0,
                totalReturn: Math.round(cumPnl * 100) / 100,
            },
            meta: { source: 'prisma-live', cached: false },
        });
    } catch (error) {
        console.error('Equity curve error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate equity curve' },
            { status: 500 }
        );
    }
}
