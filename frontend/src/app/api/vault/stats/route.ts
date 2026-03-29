/**
 * Vault Stats API — LIVE DATA
 *
 * GET /api/vault/stats
 * Returns: TVL, APY, depositor count, performance — all from real DB
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // ── Real depositor count ──
        const depositorCount = await prisma.user.count({
            where: { deposits: { some: { status: 'confirmed' } } },
        });

        // ── Real TVL from confirmed deposits minus confirmed withdrawals ──
        const depositsAgg = await prisma.deposit.aggregate({
            where: { status: 'confirmed' },
            _sum: { amount: true },
        });
        const withdrawalsAgg = await prisma.withdrawal.aggregate({
            where: { status: 'confirmed' },
            _sum: { amount: true },
        });
        const totalDeposited = depositsAgg._sum.amount ?? 0;
        const totalWithdrawn = withdrawalsAgg._sum.amount ?? 0;
        const tvl = totalDeposited - totalWithdrawn;

        // ── Latest vault snapshot (if any) ──
        const latestSnapshot = await prisma.vaultSnapshot.findFirst({
            orderBy: { timestamp: 'desc' },
        });

        // ── Trade stats ──
        const tradeCount = await prisma.tradeRecord.count();
        const closedTrades = await prisma.tradeRecord.aggregate({
            where: { status: 'closed' },
            _sum: { pnl: true, fees: true },
            _count: true,
        });
        const winningTrades = await prisma.tradeRecord.count({
            where: { status: 'closed', pnl: { gt: 0 } },
        });

        const totalPnl = closedTrades._sum.pnl ?? 0;
        const totalFees = closedTrades._sum.fees ?? 0;
        const closedCount = closedTrades._count ?? 0;
        const winRate = closedCount > 0 ? (winningTrades / closedCount) * 100 : 0;

        // ── APY calculation: annualize from realized P&L ──
        const apy = tvl > 0 ? (totalPnl / tvl) * 365 * 100 : 0;

        // ── TVL history from VaultSnapshot ──
        const snapshots = await prisma.vaultSnapshot.findMany({
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true, tvl: true, apy: true, sharePrice: true },
        });
        const tvlHistory = snapshots.map(s => ({
            date: s.timestamp.toISOString().split('T')[0],
            tvl: s.tvl,
        }));

        return NextResponse.json({
            success: true,
            data: {
                tvl,
                totalDeposited,
                totalWithdrawn,
                apy: latestSnapshot?.apy ?? apy,
                depositorCount,
                totalPnl,
                totalFees,
                tradeCount,
                closedTradeCount: closedCount,
                winRate,
                sharePrice: latestSnapshot?.sharePrice ?? 1.0,
                reserveRatio: latestSnapshot?.reserveRatio ?? (tvl > 0 ? 1.0 : 0),
                vaultStatus: tvl > 0 ? 'operational' : 'empty',
                tvlHistory,
                lastUpdated: new Date().toISOString(),
            },
            meta: {
                source: 'prisma-live',
                cached: false,
            },
        });
    } catch (error) {
        console.error('Vault stats error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch vault stats' },
            { status: 500 }
        );
    }
}
