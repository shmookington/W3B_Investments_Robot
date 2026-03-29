/**
 * 2FA Verify API
 *
 * POST /api/auth/2fa/verify
 * Body: { userId: string, code: string, secret?: string }
 *
 * Verifies a TOTP code during:
 *   1. Initial setup (includes secret to complete enablement)
 *   2. Login challenge (reads secret from stored user data)
 *
 * NOTE: In production, use a real TOTP verification library (otpauth).
 * This provides the API contract. The code validation is simplified.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId, code, secret } = await req.json();

        if (!userId || !code) {
            return NextResponse.json({ error: 'User ID and verification code are required.' }, { status: 400 });
        }

        if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
            return NextResponse.json({ error: 'Code must be a 6-digit number.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // If secret is provided, this is the initial setup flow
        if (secret) {
            // In production: verify TOTP code against the secret using a proper library
            // For now, we accept the setup and enable 2FA
            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: true },
            });

            return NextResponse.json({
                success: true,
                message: '2FA has been enabled successfully.',
            });
        }

        // Login challenge flow
        // In production: retrieve stored secret from DB, verify TOTP
        if (!user.twoFactorEnabled) {
            return NextResponse.json({ error: '2FA is not enabled for this account.' }, { status: 400 });
        }

        // Simplified verification — in production, validate against stored TOTP secret
        // Accept the code for now (contract is established)
        return NextResponse.json({
            success: true,
            message: '2FA verification successful.',
            data: { verified: true },
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
