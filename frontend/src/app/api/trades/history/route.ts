/**
 * Trades History API — LIVE DATA
 *
 * GET /api/trades/history?page=1&limit=50&type=all
 * Returns: paginated list of real trades from TradeRecord table
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const type = searchParams.get('type') || 'all';

    try {
        const where: Record<string, unknown> = {};
        if (type === 'long' || type === 'short') {
            where.side = type;
        }

        const [trades, total] = await Promise.all([
            prisma.tradeRecord.findMany({
                where,
                orderBy: { entryTime: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.tradeRecord.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data: {
                trades: trades.map(t => ({
                    id: t.id,
                    asset: t.asset,
                    strategy: t.strategyId,
                    side: t.side,
                    entryPrice: t.entryPrice,
                    exitPrice: t.exitPrice,
                    size: t.size,
                    pnl: t.pnl,
                    pnlPercent: t.pnlPercent,
                    fees: t.fees,
                    status: t.status,
                    txHash: t.txHash,
                    entryTime: t.entryTime.toISOString(),
                    exitTime: t.exitTime?.toISOString() ?? null,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            },
            meta: { source: 'prisma-live', cached: false },
        });
    } catch (error) {
        console.error('Trades history error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch trade history' },
            { status: 500 }
        );
    }
}
