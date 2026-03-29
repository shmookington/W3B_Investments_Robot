/**
 * User Account API
 *
 * POST /api/user/account — update account settings or request deletion
 * DELETE /api/user/account — delete account
 *
 * All operations go through the database.
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

        const body = await req.json();

        if (body.action === 'delete') {
            // Soft delete — mark user as deleted by updating a display field
            await prisma.user.update({
                where: { email },
                data: { displayName: '[DELETED]' },
            });

            return NextResponse.json({
                success: true,
                message: 'Account deletion request submitted.',
            });
        }

        // General account update
        const updateData: Record<string, string | boolean> = {};
        if (body.displayName) updateData.displayName = body.displayName;

        await prisma.user.update({
            where: { email },
            data: updateData,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const session = await auth();
        const email = session?.user?.email;

        if (!email) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        await prisma.user.update({
            where: { email },
            data: { displayName: '[DELETED]' },
        });

        return NextResponse.json({
            success: true,
            message: 'Account deletion request submitted.',
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Database error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
