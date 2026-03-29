/**
 * Vault Withdraw API
 *
 * POST /api/vault/withdraw
 * Body: { amount: number, method?: string }
 *
 * Records withdrawal in database and notifies the engine.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.email;

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const { amount, method = 'bank_transfer' } = await req.json();
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valid amount is required.' }, { status: 400 });
        }

        // Record withdrawal in database
        const withdrawal = await prisma.withdrawal.create({
            data: {
                userId,
                amount: parseFloat(amount),
                status: 'pending',
                fee: method === 'wire' ? 25 : 0,
            },
        });

        // Notify engine of capital withdrawal
        try {
            await fetch(`${ENGINE_URL}/portfolio/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.MONOLITH_ADMIN_API_KEY || '',
                },
                body: JSON.stringify({ userId, amount: parseFloat(amount), withdrawalId: withdrawal.id }),
            });
        } catch {
            // Engine notification is best-effort; withdrawal is recorded in DB
        }

        return NextResponse.json({
            success: true,
            data: {
                withdrawalId: withdrawal.id,
                amount: parseFloat(amount),
                method,
                fee: method === 'wire' ? 25 : 0,
                status: 'pending',
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
