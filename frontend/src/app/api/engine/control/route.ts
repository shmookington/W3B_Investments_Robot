/**
 * Engine Control — Checks health of the MONOLITH engine running on VPS
 *
 * The engine runs as a systemd service on the VPS — we cannot start/stop it
 * from a web button. This route checks if the engine is running and returns
 * its status so the UI can reflect reality.
 *
 * POST /api/engine/control
 * Body: { action: "start" | "stop" | "status" }
 */
import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.NEXT_PUBLIC_MONOLITH_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'status' || action === 'start') {
            // Check if the engine is already running on the VPS
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                const PUBLIC_KEY = process.env.NEXT_PUBLIC_MONOLITH_API_KEY || 'monolith-public-key';

                const res = await fetch(`${ENGINE_URL}/health`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'x-api-key': PUBLIC_KEY,
                    },
                });

                clearTimeout(timeout);
                const data = await res.json();

                if (data.status === 'ok') {
                    return NextResponse.json({
                        success: true,
                        running: true,
                        message: action === 'start'
                            ? 'Engine is already running on VPS'
                            : 'Engine is running',
                        uptime: data.uptime_seconds ?? 0,
                    });
                }

                return NextResponse.json({
                    success: false,
                    running: false,
                    error: 'Engine responded but status is not OK',
                });
            } catch {
                return NextResponse.json({
                    success: action === 'status',
                    running: false,
                    message: 'Engine is offline — start it via SSH on the VPS',
                    error: action === 'start' ? 'Cannot start engine remotely. The engine runs as a systemd service on the VPS. Connect via SSH to manage it.' : undefined,
                });
            }
        }

        if (action === 'stop') {
            return NextResponse.json({
                success: false,
                error: 'Cannot stop engine remotely. The engine runs as a systemd service on the VPS. Connect via SSH to manage it.',
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
