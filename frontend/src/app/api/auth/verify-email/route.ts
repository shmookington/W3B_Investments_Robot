/**
 * Email Verification API
 *
 * POST /api/auth/verify-email
 * Body: { token: string }
 *
 * Verifies a user's email address using a time-limited token.
 * Tokens are generated during registration and sent via email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
        }

        // Find user with matching verification token (reuse PasswordReset model for now)
        // In production, create a dedicated EmailVerification model
        const record = await prisma.passwordReset.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!record) {
            return NextResponse.json({ error: 'Invalid verification token.' }, { status: 400 });
        }

        if (record.used) {
            return NextResponse.json({ error: 'Token has already been used.' }, { status: 400 });
        }

        if (new Date() > record.expires) {
            return NextResponse.json({ error: 'Verification token has expired. Please request a new one.' }, { status: 400 });
        }

        // Mark email as verified
        await prisma.user.update({
            where: { id: record.userId },
            data: { emailVerified: new Date() },
        });

        // Mark token as used
        await prisma.passwordReset.update({
            where: { id: record.id },
            data: { used: true },
        });

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully.',
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
