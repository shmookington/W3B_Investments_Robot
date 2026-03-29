/**
 * Portfolio Trades Export API
 *
 * GET /api/portfolio/trades/export?format=csv
 * Proxies to MONOLITH engine: GET /execution/trades/export
 */
import { NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(`${ENGINE_URL}/execution/trades/export?format=csv`, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/csv',
                'x-api-key': process.env.MONOLITH_ADMIN_API_KEY || '',
            },
        });

        clearTimeout(timeout);

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to export trades from engine.' }, { status: res.status });
        }

        const csv = await res.text();

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="w3b-trades.csv"',
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Engine unreachable';
        return NextResponse.json({ error: msg, engine_offline: true }, { status: 502 });
    }
}
