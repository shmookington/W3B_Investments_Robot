/**
 * User 2FA API
 *
 * POST /api/user/2fa
 * Body: { action: 'enable' | 'disable' }
 *
 * Updates 2FA status in the database.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const email = session?.user?.email;

        if (!email) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const { action } = await req.json();
        const enabled = action === 'enable';

        await prisma.user.update({
            where: { email },
            data: { twoFactorEnabled: enabled },
        });

        return NextResponse.json({
            success: true,
            data: { twoFactorEnabled: enabled },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
