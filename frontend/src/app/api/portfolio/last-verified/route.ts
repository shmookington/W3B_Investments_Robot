/**
 * Portfolio Last Verified API
 *
 * GET /api/portfolio/last-verified
 * Proxies to MONOLITH engine: GET /portfolio/last-verified
 */
import { NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${ENGINE_URL}/portfolio/last-verified`, {
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
