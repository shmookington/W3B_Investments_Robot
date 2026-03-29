/**
 * Forgot Password API
 *
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates a secure reset token (15-min expiry).
 * In production: sends email with reset link.
 * In development: logs the reset link to console.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        // Always return success (don't reveal if email exists — prevents enumeration)
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // Invalidate any existing reset tokens for this user
            await prisma.passwordReset.updateMany({
                where: { userId: user.id, used: false },
                data: { used: true },
            });

            // Generate secure token
            const rawToken = randomBytes(32).toString('hex');
            const hashedToken = createHash('sha256').update(rawToken).digest('hex');

            // Store hashed token (15-minute expiry)
            await prisma.passwordReset.create({
                data: {
                    token: hashedToken,
                    userId: user.id,
                    expires: new Date(Date.now() + 15 * 60 * 1000),
                },
            });

            // Build reset URL
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

            // In production: send email (Resend, SendGrid, etc.)
            // For now: log to console
            console.log(`\n🔑 PASSWORD RESET for ${email}:\n${resetUrl}\n`);
        }

        // Always return same response (prevents email enumeration)
        return NextResponse.json({
            message: 'If an account with that email exists, a reset link has been sent.',
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
