/**
 * Performance Metrics API — LIVE DATA
 *
 * GET /api/performance/metrics
 * Returns: real KPIs computed from TradeRecord table
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // ── Total trades ──
        const totalTrades = await prisma.tradeRecord.count();

        // ── Closed trades with P&L ──
        const closedTrades = await prisma.tradeRecord.findMany({
            where: { status: 'closed' },
            select: { pnl: true, pnlPercent: true, fees: true, entryTime: true, exitTime: true },
        });

        const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0);
        const losingTrades = closedTrades.filter(t => (t.pnl ?? 0) < 0);

        const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const totalFees = closedTrades.reduce((s, t) => s + (t.fees ?? 0), 0);

        const winRate = closedTrades.length > 0
            ? (winningTrades.length / closedTrades.length) * 100
            : 0;

        const avgWin = winningTrades.length > 0
            ? winningTrades.reduce((s, t) => s + (t.pnlPercent ?? 0), 0) / winningTrades.length
            : 0;
        const avgLoss = losingTrades.length > 0
            ? losingTrades.reduce((s, t) => s + (t.pnlPercent ?? 0), 0) / losingTrades.length
            : 0;

        const profitFactor = losingTrades.length > 0
            ? Math.abs(
                winningTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) /
                losingTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
            )
            : winningTrades.length > 0 ? Infinity : 0;

        // ── Days live ──
        const firstTrade = await prisma.tradeRecord.findFirst({
            orderBy: { entryTime: 'asc' },
            select: { entryTime: true },
        });
        const liveSince = firstTrade?.entryTime ?? new Date();
        const daysLive = Math.max(1, Math.floor((Date.now() - liveSince.getTime()) / 86_400_000));
        const tradesPerDay = totalTrades > 0 ? totalTrades / daysLive : 0;

        // ── Open positions for exposure ──
        const openTrades = await prisma.tradeRecord.findMany({
            where: { status: 'open' },
            select: { side: true, size: true },
        });
        const longExposure = openTrades.filter(t => t.side === 'long').reduce((s, t) => s + t.size, 0);
        const shortExposure = openTrades.filter(t => t.side === 'short').reduce((s, t) => s + t.size, 0);
        const totalExposure = longExposure + shortExposure;

        // ── Compute returns for Sharpe approximation ──
        const returns = closedTrades.map(t => t.pnlPercent ?? 0);
        const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const variance = returns.length > 1
            ? returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1)
            : 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

        // ── Max drawdown from P&L series ──
        let peak = 0;
        let maxDD = 0;
        let cumPnl = 0;
        for (const t of closedTrades) {
            cumPnl += (t.pnl ?? 0);
            if (cumPnl > peak) peak = cumPnl;
            const dd = peak > 0 ? ((cumPnl - peak) / peak) * 100 : 0;
            if (dd < maxDD) maxDD = dd;
        }

        return NextResponse.json({
            success: true,
            data: {
                totalReturn: totalPnl,
                winRate: Math.round(winRate * 10) / 10,
                sharpeRatio: Math.round(sharpeRatio * 100) / 100,
                maxDrawdown: Math.round(maxDD * 100) / 100,
                profitFactor: profitFactor === Infinity ? '∞' : Math.round(profitFactor * 100) / 100,
                averageWin: Math.round(avgWin * 100) / 100,
                averageLoss: Math.round(avgLoss * 100) / 100,
                totalTrades,
                closedTrades: closedTrades.length,
                tradesPerDay: Math.round(tradesPerDay * 10) / 10,
                totalFees: Math.round(totalFees * 100) / 100,
                longExposure: Math.round(longExposure),
                shortExposure: Math.round(shortExposure),
                netExposure: Math.round(longExposure - shortExposure),
                liveSince: liveSince.toISOString(),
                daysLive,
                lastUpdated: new Date().toISOString(),
            },
            meta: {
                source: 'prisma-live',
                cached: false,
            },
        });
    } catch (error) {
        console.error('Performance metrics error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to compute metrics' },
            { status: 500 }
        );
    }
}
