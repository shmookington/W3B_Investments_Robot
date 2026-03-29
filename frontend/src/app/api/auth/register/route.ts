/**
 * Registration API Route
 *
 * POST /api/auth/register
 * Body: { email, password }
 *
 * Creates a new customer account with bcrypt-hashed password.
 * Admin accounts can ONLY be created via direct database modification.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        if (typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
        }

        if (typeof password !== 'string' || password.length < 12) {
            return NextResponse.json({ error: 'Password must be at least 12 characters.' }, { status: 400 });
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        // Hash password (bcrypt, cost factor 12)
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user — ALWAYS customer role (admin is DB-only)
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: 'customer',
            },
        });

        return NextResponse.json(
            { message: 'Account created successfully.', userId: user.id },
            { status: 201 }
        );
    } catch {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
