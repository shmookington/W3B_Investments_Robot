/**
 * Vault User Position API
 *
 * GET /api/vault/user/[address]
 * Returns: user's fund position from the engine
 *
 * Proxies to MONOLITH engine: GET /portfolio/user-position
 */
import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    const { address: userId } = await params;

    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'User identifier is required.' },
            { status: 400 }
        );
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${ENGINE_URL}/portfolio/user-position?userId=${userId}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_MONOLITH_API_KEY || '',
            },
        });

        clearTimeout(timeout);
        const data = await res.json();

        return NextResponse.json({
            success: true,
            data,
            meta: {
                source: 'monolith-engine',
                exchange: 'Kalshi',
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({ error: msg, engine_offline: true }, { status: 502 });
    }
}
