/**
 * Strategy Status API — LIVE DATA
 *
 * GET /api/strategy/status
 * Returns: real strategy performance from TradeRecord groupings
 * 🔒 Requires API key
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    // 🔒 Require API key for sensitive strategy data
    const authError = requireApiKey(req);
    if (authError) return authError;

    try {
        // ── Get all unique strategies from trades ──
        const strategyGroups = await prisma.tradeRecord.groupBy({
            by: ['strategyId'],
            _count: true,
            _sum: { pnl: true, fees: true, size: true },
        });

        // ── Build strategy stats ──
        const strategies = await Promise.all(
            strategyGroups.map(async (sg) => {
                const name = sg.strategyId;

                // Trades in last 24h
                const tradesLast24h = await prisma.tradeRecord.count({
                    where: {
                        strategyId: name,
                        entryTime: { gte: new Date(Date.now() - 86_400_000) },
                    },
                });

                // Win rate last 7d
                const closedLast7d = await prisma.tradeRecord.findMany({
                    where: {
                        strategyId: name,
                        status: 'closed',
                        exitTime: { gte: new Date(Date.now() - 7 * 86_400_000) },
                    },
                    select: { pnl: true },
                });
                const winRateLast7d = closedLast7d.length > 0
                    ? (closedLast7d.filter(t => (t.pnl ?? 0) > 0).length / closedLast7d.length) * 100
                    : 0;

                // 24h P&L
                const pnl24h = await prisma.tradeRecord.aggregate({
                    where: {
                        strategyId: name,
                        status: 'closed',
                        exitTime: { gte: new Date(Date.now() - 86_400_000) },
                    },
                    _sum: { pnl: true },
                });

                // Open positions count
                const openCount = await prisma.tradeRecord.count({
                    where: { strategyId: name, status: 'open' },
                });

                return {
                    id: `strat-${name}`,
                    name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    type: name,
                    status: openCount > 0 || tradesLast24h > 0 ? 'active' : 'paused',
                    pnl24h: Math.round((pnl24h._sum.pnl ?? 0) * 100) / 100,
                    pnlTotal: Math.round((sg._sum.pnl ?? 0) * 100) / 100,
                    totalTrades: sg._count,
                    tradesLast24h,
                    winRateLast7d: Math.round(winRateLast7d * 10) / 10,
                    totalFees: Math.round((sg._sum.fees ?? 0) * 100) / 100,
                    lastUpdated: new Date().toISOString(),
                };
            })
        );

        // If no trades exist yet, show configured strategies from engine
        if (strategies.length === 0) {
            const configuredStrategies = [
                { id: 'strat-momentum', name: 'Momentum', type: 'momentum', status: 'warmup' },
                { id: 'strat-stat-arb', name: 'Statistical Arbitrage', type: 'stat_arb', status: 'warmup' },
                { id: 'strat-funding-arb', name: 'Funding Rate Arbitrage', type: 'funding_rate_arb', status: 'warmup' },
                { id: 'strat-sentiment', name: 'Sentiment', type: 'sentiment', status: 'warmup' },
            ];

            return NextResponse.json({
                success: true,
                data: {
                    strategies: configuredStrategies.map(s => ({
                        ...s,
                        pnl24h: 0,
                        pnlTotal: 0,
                        totalTrades: 0,
                        tradesLast24h: 0,
                        winRateLast7d: 0,
                        totalFees: 0,
                        lastUpdated: new Date().toISOString(),
                    })),
                    summary: {
                        total: configuredStrategies.length,
                        active: 0,
                        warmup: configuredStrategies.length,
                        message: 'Paper trading started — strategies warming up',
                    },
                },
                meta: { source: 'prisma-live', cached: false },
            });
        }

        const active = strategies.filter(s => s.status === 'active').length;

        return NextResponse.json({
            success: true,
            data: {
                strategies,
                summary: {
                    total: strategies.length,
                    active,
                    paused: strategies.filter(s => s.status === 'paused').length,
                    portfolioPnl24h: strategies.reduce((sum, s) => sum + s.pnl24h, 0),
                },
            },
            meta: { source: 'prisma-live', cached: false },
        });
    } catch (error) {
        console.error('Strategy status error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch strategy status' },
            { status: 500 }
        );
    }
}
