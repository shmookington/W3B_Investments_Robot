/**
 * Apple Pay Session API
 *
 * POST /api/payments/apple-pay/session
 * Body: { validationURL: string }
 *
 * Creates an Apple Pay merchant session for payment authorization.
 * Called by Apple Pay JS when the user activates the payment sheet.
 *
 * Flow:
 *   1. User taps "Pay with Apple Pay" button
 *   2. Apple Pay JS calls onvalidatemerchant
 *   3. Frontend sends validationURL to this endpoint
 *   4. Server validates merchant with Apple → returns session
 *   5. Frontend passes session back to Apple Pay JS
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMerchantSession, APPLE_PAY_CONFIG } from '@/lib/applePayService';

export async function POST(req: NextRequest) {
    try {
        const { validationURL } = await req.json();

        if (!validationURL || typeof validationURL !== 'string') {
            return NextResponse.json(
                { error: 'validationURL is required.' },
                { status: 400 }
            );
        }

        // Validate that the URL is from Apple
        if (!validationURL.includes('apple.com')) {
            return NextResponse.json(
                { error: 'Invalid Apple Pay validation URL.' },
                { status: 400 }
            );
        }

        const session = createMerchantSession(validationURL);

        return NextResponse.json({
            success: true,
            data: session,
        });
    } catch {
        return NextResponse.json({ error: 'Failed to create Apple Pay session.' }, { status: 500 });
    }
}

/**
 * GET handler — returns Apple Pay configuration for the frontend
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        data: {
            merchantId: APPLE_PAY_CONFIG.merchantId,
            merchantName: APPLE_PAY_CONFIG.merchantName,
            supportedNetworks: APPLE_PAY_CONFIG.supportedNetworks,
            merchantCapabilities: APPLE_PAY_CONFIG.merchantCapabilities,
            countryCode: APPLE_PAY_CONFIG.countryCode,
            currencyCode: APPLE_PAY_CONFIG.currencyCode,
            minimumAmount: APPLE_PAY_CONFIG.minimumAmount,
            maximumAmount: APPLE_PAY_CONFIG.maximumAmount,
            processingFeePercent: APPLE_PAY_CONFIG.processingFeePercent,
        },
    });
}
