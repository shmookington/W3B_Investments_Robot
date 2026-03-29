/**
 * User Transactions Export API
 *
 * GET /api/user/transactions/export?format=csv
 * Exports transaction history from the database as CSV.
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

        const deposits = await prisma.deposit.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const withdrawals = await prisma.withdrawal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const rows = [
            'Date,Type,Amount,Reference,Status',
            ...deposits.map((d: { createdAt: Date; amount: number; id: string; status: string }) =>
                `${d.createdAt.toISOString().slice(0, 10)},deposit,$${d.amount.toFixed(2)},DEP-${d.id.slice(0, 8).toUpperCase()},${d.status}`
            ),
            ...withdrawals.map((w: { createdAt: Date; amount: number; id: string; status: string }) =>
                `${w.createdAt.toISOString().slice(0, 10)},withdraw,$${w.amount.toFixed(2)},WDR-${w.id.slice(0, 8).toUpperCase()},${w.status}`
            ),
        ].join('\n');

        return new NextResponse(rows, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="w3b-transactions.csv"',
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
