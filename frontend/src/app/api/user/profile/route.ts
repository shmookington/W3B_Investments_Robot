/**
 * User Profile API
 *
 * GET /api/user/profile — returns user profile from database
 * POST /api/user/profile — updates user preferences in database
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();
        const email = session?.user?.email;

        if (!email) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                displayName: true,
                role: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                displayName: user.displayName || '',
                email: user.email,
                accountId: user.id,
                status: 'active',
                tier: user.role || 'standard',
                verified: !!user.emailVerified,
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const email = session?.user?.email;

        if (!email) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const body = await req.json();

        await prisma.user.update({
            where: { email },
            data: {
                displayName: body.displayName ?? undefined,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully.',
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
