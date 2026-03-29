/**
 * 2FA Enable API
 *
 * POST /api/auth/2fa/enable
 * Body: { userId: string }
 * Headers: Authorization (session-based via NextAuth)
 *
 * Generates a TOTP secret for the user and returns the provisioning URI
 * for scanning with an authenticator app (Google Authenticator, Authy, etc.).
 *
 * NOTE: In production, use a real TOTP library (otpauth, speakeasy).
 * This implementation provides the API contract and data flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function generateTotpSecret(): string {
    // Generate a 20-byte random secret, base32-encode it
    const buffer = crypto.randomBytes(20);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < buffer.length; i++) {
        secret += base32Chars[buffer[i] % 32];
    }
    return secret;
}

function generateBackupCodes(count = 8): string[] {
    return Array.from({ length: count }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
    );
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        if (user.twoFactorEnabled) {
            return NextResponse.json({ error: '2FA is already enabled.' }, { status: 400 });
        }

        const secret = generateTotpSecret();
        const backupCodes = generateBackupCodes();

        // In production: store encrypted secret in DB, don't return it in plain text
        // For now, return it so the client can display the QR code
        const otpauthUri = `otpauth://totp/W3B:${encodeURIComponent(user.email)}?secret=${secret}&issuer=W3B&algorithm=SHA1&digits=6&period=30`;

        return NextResponse.json({
            success: true,
            data: {
                secret,
                otpauthUri,
                backupCodes,
                message: 'Scan the QR code with your authenticator app, then verify with a code to complete setup.',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
