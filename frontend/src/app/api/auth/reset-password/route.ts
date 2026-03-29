/**
 * Reset Password API
 *
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Validates the reset token and updates the user's password.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
        }

        if (typeof password !== 'string' || password.length < 12) {
            return NextResponse.json({ error: 'Password must be at least 12 characters.' }, { status: 400 });
        }

        // Hash the incoming token to compare with stored hash
        const hashedToken = createHash('sha256').update(token).digest('hex');

        // Find valid, unused, non-expired token
        const resetRecord = await prisma.passwordReset.findFirst({
            where: {
                token: hashedToken,
                used: false,
                expires: { gt: new Date() },
            },
            include: { user: true },
        });

        if (!resetRecord) {
            return NextResponse.json(
                { error: 'Invalid or expired reset link. Please request a new one.' },
                { status: 400 }
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update password and mark token as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetRecord.userId },
                data: { passwordHash },
            }),
            prisma.passwordReset.update({
                where: { id: resetRecord.id },
                data: { used: true },
            }),
        ]);

        return NextResponse.json({ message: 'Password reset successfully.' });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
