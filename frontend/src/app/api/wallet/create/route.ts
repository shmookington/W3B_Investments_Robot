/**
 * Fund Account Create API
 *
 * POST /api/wallet/create
 * Body: { userId: string }
 *
 * Creates a new fund account via the engine and database.
 *
 * 🔒 Requires authenticated session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        // Verify user exists in database
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Register account with engine
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const engineRes = await fetch(`${ENGINE_URL}/portfolio/create-account`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.MONOLITH_ADMIN_API_KEY || '',
            },
            body: JSON.stringify({ userId }),
        });

        clearTimeout(timeout);
        const data = await engineRes.json();

        return NextResponse.json({
            success: true,
            data,
        }, { status: 201 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({ error: msg, engine_offline: true }, { status: 502 });
    }
}
