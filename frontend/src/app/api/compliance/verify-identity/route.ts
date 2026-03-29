/**
 * Compliance: Identity Verification API
 *
 * POST /api/compliance/verify-identity
 * Body: { userId: string }
 *
 * Initiates a Privado ID ZK-identity verification flow.
 * Returns QR code data for the user to scan with their Privado ID app.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createVerificationRequest, verifyProof, isPrivadoConfigured } from '@/lib/compliance';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, proof } = body;

        // If proof is provided, this is a callback verification
        if (proof) {
            const requestId = body.requestId;
            if (!requestId) {
                return NextResponse.json(
                    { error: 'Request ID is required for proof verification.' },
                    { status: 400 }
                );
            }

            const result = await verifyProof(requestId, proof);

            return NextResponse.json({
                success: result.verified,
                data: {
                    verified: result.verified,
                    provider: result.provider,
                    claims: result.claims,
                    verifiedAt: result.verifiedAt,
                },
                error: result.error,
            });
        }

        // Otherwise, create a new verification request
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required.' },
                { status: 400 }
            );
        }

        const configured = isPrivadoConfigured();
        const baseUrl = req.nextUrl.origin;
        const request = await createVerificationRequest(userId, baseUrl);

        return NextResponse.json({
            success: true,
            data: {
                requestId: request.requestId,
                qrCodeData: request.qrCodeData,
                expiresAt: request.expiresAt,
                configured,
                status: request.status,
            },
        });
    } catch {
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
