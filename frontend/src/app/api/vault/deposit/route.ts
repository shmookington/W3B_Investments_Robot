/**
 * Vault Deposit API
 *
 * POST /api/vault/deposit
 * Body: { amount: number, method?: string }
 *
 * Records deposit in database and notifies the engine.
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

        // Record deposit in database
        const deposit = await prisma.deposit.create({
            data: {
                userId,
                amount: parseFloat(amount),
                status: 'pending',
                source: method,
            },
        });

        // Notify engine of new capital
        try {
            await fetch(`${ENGINE_URL}/portfolio/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.MONOLITH_ADMIN_API_KEY || '',
                },
                body: JSON.stringify({ userId, amount: parseFloat(amount), depositId: deposit.id }),
            });
        } catch {
            // Engine notification is best-effort; deposit is recorded in DB
        }

        return NextResponse.json({
            success: true,
            data: {
                depositId: deposit.id,
                amount: parseFloat(amount),
                method,
                status: 'pending',
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
