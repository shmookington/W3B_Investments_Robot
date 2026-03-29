/**
 * Apple Pay Payment Processing API
 *
 * POST /api/payments/apple-pay/process
 * Body: { userId, paymentToken, amount, depositToVault? }
 *
 * Processes an Apple Pay payment for fund deposits:
 *   1. Validate payment amount and token
 *   2. Charge via Stripe (fiat processing)
 *   3. Credit funds to user's fund account
 *   4. Record deposit and allocate across sport models
 *   5. Generate receipt and record transaction
 *
 * Also handles:
 *   POST /api/payments/apple-pay/process?action=refund
 *   Body: { receiptId, reason, userId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    processPayment,
    processRefund,
    validatePaymentAmount,
    calculateFees,
    type ApplePayPaymentRequest,
} from '@/lib/applePayService';

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        // ─── Refund flow ───
        if (action === 'refund') {
            const { receiptId, reason, userId } = await req.json();

            if (!receiptId || !reason || !userId) {
                return NextResponse.json(
                    { error: 'receiptId, reason, and userId are required.' },
                    { status: 400 }
                );
            }

            const refund = processRefund({ receiptId, reason, userId });

            return NextResponse.json({
                success: true,
                data: refund,
            });
        }

        // ─── Payment flow ───
        const body = await req.json();
        const { userId, paymentToken, amount, depositToVault = true } = body as ApplePayPaymentRequest;

        // Validate inputs
        if (!userId || !paymentToken || !amount) {
            return NextResponse.json(
                { error: 'userId, paymentToken, and amount are required.' },
                { status: 400 }
            );
        }

        // Validate amount
        const amountCheck = validatePaymentAmount(amount);
        if (!amountCheck.valid) {
            return NextResponse.json({ error: amountCheck.error }, { status: 400 });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Process payment
        const receipt = processPayment({
            userId,
            paymentToken,
            amount,
            depositToVault,
        });

        // Record deposit in database
        if (depositToVault) {
            await prisma.deposit.create({
                data: {
                    userId,
                    amount,
                    txHash: receipt.stripeChargeId,
                    status: 'pending',
                    source: 'apple_pay',
                },
            });
        }

        const referenceId = `DEP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        return NextResponse.json({
            success: true,
            data: {
                receipt,
                referenceId,
                fees: calculateFees(amount),
                message: depositToVault
                    ? 'Payment processing. Funds will be credited to your account and allocated across sports models.'
                    : 'Payment processing. Funds will be credited to your account balance.',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Payment processing failed.' }, { status: 500 });
    }
}
