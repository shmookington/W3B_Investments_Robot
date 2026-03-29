/**
 * User Transactions API
 *
 * GET /api/user/transactions
 * Returns transaction history from the database.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.email;

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        // Fetch deposits
        const deposits = await prisma.deposit.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Fetch withdrawals
        const withdrawals = await prisma.withdrawal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Merge and sort
        const transactions = [
            ...deposits.map((d: { id: string; amount: number; createdAt: Date; status: string }) => ({
                id: d.id,
                type: 'deposit' as const,
                amount: d.amount,
                date: d.createdAt.toISOString().slice(0, 10),
                timestamp: d.createdAt.getTime(),
                ref: `DEP-${d.id.slice(0, 8).toUpperCase()}`,
                status: d.status,
            })),
            ...withdrawals.map((w: { id: string; amount: number; createdAt: Date; status: string }) => ({
                id: w.id,
                type: 'withdraw' as const,
                amount: w.amount,
                date: w.createdAt.toISOString().slice(0, 10),
                timestamp: w.createdAt.getTime(),
                ref: `WDR-${w.id.slice(0, 8).toUpperCase()}`,
                status: w.status,
            })),
        ].sort((a, b) => b.timestamp - a.timestamp);

        return NextResponse.json({ success: true, data: transactions });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
