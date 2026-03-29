/**
 * Compliance: User Verification API
 *
 * GET /api/compliance/wallet-check/[address]
 *
 * Runs KYC/AML verification through the compliance service.
 * Accepts user IDs or account identifiers.
 *
 * 🔒 Requires API key for production use.
 */
import { NextRequest, NextResponse } from 'next/server';
import { screenAddress, screenWallet } from '@/lib/compliance';
import { requireApiKey } from '@/lib/apiAuth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    const authError = requireApiKey(req);
    if (authError) return authError;

    try {
        const { address: userIdentifier } = await params;

        if (!userIdentifier) {
            return NextResponse.json(
                { error: 'User identifier is required.' },
                { status: 400 }
            );
        }

        // Run compliance checks through the real compliance service
        const ofacResult = await screenAddress(userIdentifier);
        const walletResult = await screenWallet(userIdentifier);
        const cleared = !ofacResult.sanctioned && !walletResult.blocksTransaction;

        return NextResponse.json({
            success: true,
            data: {
                userId: userIdentifier,
                cleared,
                kyc: {
                    status: cleared ? 'verified' : 'blocked',
                    sanctioned: ofacResult.sanctioned,
                    source: ofacResult.source,
                },
                aml: {
                    riskScore: walletResult.riskScore,
                    riskLevel: walletResult.riskLevel,
                    flags: walletResult.flags,
                    provider: walletResult.provider,
                },
                checkedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Compliance check failed';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
