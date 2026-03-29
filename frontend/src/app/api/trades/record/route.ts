/**
 * Trade Recording API
 *
 * POST /api/trades/record — Record a new trade (API key required)
 * GET  /api/trades/record — Get trade history + stats (public)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiAuth';
import { recordTrade, getTrades, computeStats } from '@/lib/tradeRecorder';

/**
 * POST — Record a trade (internal, API key required)
 */
export async function POST(req: NextRequest) {
    const authError = requireApiKey(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { asset, side, entryPrice, exitPrice, pnlBps, size, strategy } = body;

        if (!asset || !side || entryPrice == null || exitPrice == null || pnlBps == null) {
            return NextResponse.json(
                { error: 'Missing required fields: asset, side, entryPrice, exitPrice, pnlBps' },
                { status: 400 }
            );
        }

        const result = await recordTrade({
            asset,
            side,
            entryPrice,
            exitPrice,
            pnlBps,
            size: size || 0,
            strategy: strategy || 'default',
        });

        return NextResponse.json({
            success: true,
            data: result,
        }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

/**
 * GET — Public trade history and performance stats
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const statsOnly = url.searchParams.get('stats') === 'true';

        const stats = computeStats();

        if (statsOnly) {
            return NextResponse.json({ success: true, data: { stats } });
        }

        const trades = getTrades(limit, offset);

        return NextResponse.json({
            success: true,
            data: {
                trades,
                stats,
                pagination: {
                    limit,
                    offset,
                    total: stats.totalTrades,
                },
            },
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
