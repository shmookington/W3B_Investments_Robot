/**
 * Real-Time Event Stream (SSE) — LIVE DATA
 *
 * GET /api/stream
 * Streams real-time events from the database:
 *   - trade         — New trades (polled from TradeRecord)
 *   - pnl_update    — Live P&L from trade totals
 *   - heartbeat     — Keep-alive with system stats
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/* ─── Event Types ─── */
interface StreamEvent {
    type: 'trade' | 'pnl_update' | 'heartbeat' | 'system_log';
    data: Record<string, unknown>;
    timestamp: string;
}

/* ─── Fetch latest trades since a cursor ─── */
async function getNewTrades(since: Date) {
    return prisma.tradeRecord.findMany({
        where: { entryTime: { gt: since } },
        orderBy: { entryTime: 'desc' },
        take: 20,
    });
}

/* ─── Compute live P&L ─── */
async function getLivePnl() {
    const agg = await prisma.tradeRecord.aggregate({
        where: { status: 'closed' },
        _sum: { pnl: true, fees: true },
        _count: true,
    });
    const openCount = await prisma.tradeRecord.count({ where: { status: 'open' } });
    return {
        realizedPnl: agg._sum.pnl ?? 0,
        totalFees: agg._sum.fees ?? 0,
        closedTrades: agg._count ?? 0,
        openPositions: openCount,
    };
}

/* ─── SSE Stream Handler ─── */
export async function GET(req: NextRequest) {
    const accept = req.headers.get('accept') || '';
    if (!accept.includes('text/event-stream') && !req.nextUrl.searchParams.has('stream')) {
        return new Response(
            JSON.stringify({
                success: true,
                message: 'W3B Real-Time Stream. Connect via EventSource or add ?stream=true.',
                channels: ['trade', 'pnl_update', 'heartbeat', 'system_log'],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const encoder = new TextEncoder();
    let closed = false;
    let lastTradeCheck = new Date(Date.now() - 60_000); // Start 1 min ago
    let seenTradeIds = new Set<string>();

    const stream = new ReadableStream({
        start(controller) {
            function sendEvent(event: StreamEvent) {
                if (closed) return;
                try {
                    const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch {
                    closed = true;
                }
            }

            // ── Heartbeat every 15s ──
            const heartbeatInterval = setInterval(async () => {
                try {
                    const totalTrades = await prisma.tradeRecord.count();
                    const pnl = await getLivePnl();
                    sendEvent({
                        type: 'heartbeat',
                        data: {
                            totalTrades,
                            ...pnl,
                            serverTime: new Date().toISOString(),
                        },
                        timestamp: new Date().toISOString(),
                    });
                } catch { /* ignore */ }
            }, 15_000);

            // ── Poll for new trades every 3s ──
            const tradeInterval = setInterval(async () => {
                try {
                    const trades = await getNewTrades(lastTradeCheck);
                    for (const t of trades) {
                        if (seenTradeIds.has(t.id)) continue;
                        seenTradeIds.add(t.id);

                        sendEvent({
                            type: 'trade',
                            data: {
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
                            },
                            timestamp: t.entryTime.toISOString(),
                        });
                    }
                    if (trades.length > 0) {
                        lastTradeCheck = trades[0].entryTime;
                    }
                    // Keep set from growing forever
                    if (seenTradeIds.size > 500) {
                        seenTradeIds = new Set([...seenTradeIds].slice(-200));
                    }
                } catch { /* ignore */ }
            }, 3_000);

            // ── P&L updates every 10s ──
            const pnlInterval = setInterval(async () => {
                try {
                    const pnl = await getLivePnl();
                    sendEvent({
                        type: 'pnl_update',
                        data: pnl,
                        timestamp: new Date().toISOString(),
                    });
                } catch { /* ignore */ }
            }, 10_000);

            // Send initial burst
            (async () => {
                try {
                    const totalTrades = await prisma.tradeRecord.count();
                    const pnl = await getLivePnl();
                    sendEvent({
                        type: 'heartbeat',
                        data: { totalTrades, ...pnl, serverTime: new Date().toISOString() },
                        timestamp: new Date().toISOString(),
                    });

                    // Send last 20 trades as initial state
                    const recentTrades = await prisma.tradeRecord.findMany({
                        orderBy: { entryTime: 'desc' },
                        take: 20,
                    });
                    for (const t of recentTrades.reverse()) {
                        seenTradeIds.add(t.id);
                        sendEvent({
                            type: 'trade',
                            data: {
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
                            },
                            timestamp: t.entryTime.toISOString(),
                        });
                    }
                    if (recentTrades.length > 0) {
                        lastTradeCheck = recentTrades[0].entryTime;
                    }
                } catch { /* ignore */ }
            })();

            // Cleanup on abort
            req.signal.addEventListener('abort', () => {
                closed = true;
                clearInterval(heartbeatInterval);
                clearInterval(tradeInterval);
                clearInterval(pnlInterval);
                try { controller.close(); } catch { /* already closed */ }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
