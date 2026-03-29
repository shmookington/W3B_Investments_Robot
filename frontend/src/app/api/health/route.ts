/**
 * System Health API — LIVE DATA
 *
 * GET /api/health
 * Returns: real system health by pinging MONOLITH engine + DB
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MONOLITH_API = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

async function pingService(name: string, fn: () => Promise<void>): Promise<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    lastCheck: string;
    details?: string;
}> {
    const start = Date.now();
    try {
        await fn();
        return {
            name,
            status: 'healthy',
            latencyMs: Date.now() - start,
            lastCheck: new Date().toISOString(),
        };
    } catch (error) {
        return {
            name,
            status: 'down',
            latencyMs: Date.now() - start,
            lastCheck: new Date().toISOString(),
            details: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function GET() {
    const now = new Date().toISOString();

    const services = await Promise.all([
        // Ping MONOLITH engine
        pingService('monolith-engine', async () => {
            const res = await fetch(`${MONOLITH_API}/health`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }),

        // Ping database
        pingService('database', async () => {
            await prisma.user.count();
        }),

        // Auth service (it's in-process, so just check Prisma session table)
        pingService('auth-service', async () => {
            await prisma.session.count();
        }),

        // Vault contract — not yet deployed
        Promise.resolve({
            name: 'vault-contract',
            status: 'degraded' as const,
            latencyMs: 0,
            lastCheck: now,
            details: 'Not yet deployed — pre-launch',
        }),
    ]);

    const allHealthy = services.every(s => s.status === 'healthy');
    const anyDown = services.some(s => s.status === 'down');

    return NextResponse.json({
        success: true,
        data: {
            status: anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded',
            version: '0.1.0',
            environment: process.env.NODE_ENV || 'development',
            services,
            timestamp: now,
        },
    });
}
