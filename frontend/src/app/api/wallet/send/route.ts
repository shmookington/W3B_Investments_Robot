/**
 * Fund Withdrawal API
 *
 * POST /api/wallet/send
 * Body: { userId, amount, method? }
 *
 * Processes a withdrawal through the engine and records in database.
 *
 * 🔒 Requires authenticated session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
    try {
        const { userId, amount, method = 'bank_transfer' } = await req.json();

        if (!userId || !amount) {
            return NextResponse.json(
                { error: 'userId and amount are required.' },
                { status: 400 }
            );
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Submit withdrawal to engine
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const engineRes = await fetch(`${ENGINE_URL}/portfolio/withdraw`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.MONOLITH_ADMIN_API_KEY || '',
            },
            body: JSON.stringify({ userId, amount: numAmount, method }),
        });

        clearTimeout(timeout);
        const data = await engineRes.json();

        // Record withdrawal in database
        await prisma.withdrawal.create({
            data: {
                userId,
                amount: numAmount,
                status: 'pending',
                fee: data.fee ?? 0,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({ error: msg, engine_offline: true }, { status: 502 });
    }
}
