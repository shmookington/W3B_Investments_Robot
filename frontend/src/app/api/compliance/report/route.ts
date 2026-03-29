/**
 * Compliance: Suspicious Activity Report API
 *
 * POST /api/compliance/report
 * Body: { userId, walletAddress, alertType, amount, description }
 *
 * Internal endpoint for filing suspicious activity reports.
 * Used by the transaction monitor and manual review processes.
 *
 * 🔒 Requires API key.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    // Require API key
    const authError = requireApiKey(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { userId, walletAddress, alertType, amount, description, severity } = body;

        if (!walletAddress || !alertType) {
            return NextResponse.json(
                { error: 'walletAddress and alertType are required.' },
                { status: 400 }
            );
        }

        // Store compliance alert in database
        const alert = await prisma.complianceAlert.create({
            data: {
                userId: userId || null,
                walletAddress,
                alertType,
                amount: amount || 0,
                description: description || '',
                severity: severity || 'warning',
                status: 'pending',
            },
        });

        // In production: send notification to compliance team
        console.warn(`[ComplianceAlert] ${alertType} — wallet: ${walletAddress}, amount: $${amount}, severity: ${severity}`);

        return NextResponse.json({
            success: true,
            data: {
                alertId: alert.id,
                status: 'pending',
                message: 'Suspicious activity report filed successfully.',
            },
        }, { status: 201 });
    } catch (error) {
        console.error('[ComplianceReport] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/compliance/report — List compliance alerts (admin only)
 */
export async function GET(req: NextRequest) {
    const authError = requireApiKey(req);
    if (authError) return authError;

    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status') || undefined;
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

        const alerts = await prisma.complianceAlert.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: alerts,
            count: alerts.length,
        });
    } catch {
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
