/**
 * Portfolio Summary API
 *
 * GET /api/portfolio/summary
 * Proxies to MONOLITH engine: GET /portfolio/current
 */
import { NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${ENGINE_URL}/portfolio/current`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_MONOLITH_API_KEY || '',
            },
        });

        clearTimeout(timeout);
        const data = await res.json();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({ error: msg, engine_offline: true }, { status: 502 });
    }
}
