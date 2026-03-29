/**
 * Account Deletion API
 *
 * POST /api/auth/delete-account
 * Body: { userId: string, password: string, confirmation: "DELETE MY ACCOUNT" }
 *
 * Permanently deletes a user account and all associated data.
 * Requires password re-confirmation and explicit text confirmation.
 * Connected to the "Danger Zone" section on the settings page.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId, password, confirmation } = await req.json();

        // Validate inputs
        if (!userId || !password || !confirmation) {
            return NextResponse.json(
                { error: 'User ID, password, and confirmation text are required.' },
                { status: 400 }
            );
        }

        if (confirmation !== 'DELETE MY ACCOUNT') {
            return NextResponse.json(
                { error: 'Please type "DELETE MY ACCOUNT" to confirm.' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Prevent admin self-deletion
        if (user.role === 'admin') {
            return NextResponse.json(
                { error: 'Admin accounts cannot be deleted via API. Contact system administrator.' },
                { status: 403 }
            );
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
        }

        // Check for active deposits — prevent deletion if funds are in vault
        const activeDeposits = await prisma.deposit.count({
            where: { userId, status: 'confirmed' },
        });

        if (activeDeposits > 0) {
            return NextResponse.json(
                { error: 'Cannot delete account with active deposits. Please withdraw all funds first.' },
                { status: 400 }
            );
        }

        // Delete user (cascading deletes handle sessions, resets, prefs, etc.)
        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({
            success: true,
            message: 'Account has been permanently deleted.',
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
