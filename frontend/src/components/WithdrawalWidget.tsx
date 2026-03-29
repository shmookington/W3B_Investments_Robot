'use client';

import { useState, useCallback } from 'react';
import { HoloPanel } from './HoloPanel';
import styles from './WithdrawalWidget.module.css';

interface WithdrawalWidgetProps {
    /** Current fund balance */
    fundBalance: number;
    /** P&L (unrealized gains/losses) */
    pnl?: number;
    /** Estimated processing time */
    processingTime?: string;
    /** Callback when withdrawal is confirmed */
    onWithdraw: (amount: number) => Promise<void>;
}

type Phase = 'idle' | 'pending' | 'success' | 'error';

/**
 * WithdrawalWidget — Fund withdrawal flow.
 */
export function WithdrawalWidget({
    fundBalance,
    pnl = 0,
    processingTime = '1-2 business days',
    onWithdraw,
}: WithdrawalWidgetProps) {
    const [amount, setAmount] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');

    const numAmount = Number(amount) || 0;
    const isValid = numAmount > 0 && numAmount <= fundBalance;

    const handleWithdraw = useCallback(async () => {
        if (!isValid) return;
        setPhase('pending');
        setError('');
        try {
            await onWithdraw(numAmount);
            setPhase('success');
            setAmount('');
            setTimeout(() => setPhase('idle'), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Withdrawal failed');
            setPhase('error');
            setTimeout(() => setPhase('idle'), 3000);
        }
    }, [isValid, numAmount, onWithdraw]);

    return (
        <HoloPanel size="md" depth="foreground" glow={phase === 'success' ? 'green' : undefined} header="WITHDRAW">
            {phase === 'success' ? (
                <div className={styles.successState}>
                    <span className={styles.checkmark}>✓</span>
                    <p className={styles.successText}>WITHDRAWAL INITIATED</p>
                    <p className={styles.successSub}>Estimated arrival: {processingTime}</p>
                </div>
            ) : (
                <>
                    {/* Balance display */}
                    <div className={styles.balanceDisplay}>
                        <div className={styles.balanceRow}>
                            <span className={styles.balanceLabel}>Fund Balance</span>
                            <span className={styles.balanceValue}>${fundBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className={styles.balanceRow}>
                            <span className={styles.balanceLabel}>Unrealized P&L</span>
                            <span className={styles.pnlValue} style={{ color: pnl >= 0 ? '#28ca41' : '#ff4d6a' }}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Amount input */}
                    <div className={styles.field}>
                        <label className={styles.label}>WITHDRAWAL AMOUNT</label>
                        <div className={styles.inputRow}>
                            <input
                                type="number"
                                className={styles.input}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                min={0}
                                max={fundBalance}
                                disabled={phase === 'pending'}
                            />
                            <span className={styles.token}>USD</span>
                        </div>
                        <div className={styles.quickAmounts}>
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    className={styles.quickBtn}
                                    onClick={() => setAmount(String(Math.floor(fundBalance * pct / 100 * 100) / 100))}
                                    disabled={phase === 'pending'}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info */}
                    <div className={styles.infoBox}>
                        <div className={styles.infoRow}>
                            <span>Withdrawal Fee</span>
                            <span className={styles.feeHighlight}>0%</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span>Processing Time</span>
                            <span>{processingTime}</span>
                        </div>
                    </div>

                    {error && <div className={styles.error}>⚠ {error}</div>}

                    <button
                        className={`${styles.submitBtn} ${phase === 'pending' ? styles.submitting : ''}`}
                        onClick={handleWithdraw}
                        disabled={!isValid || phase === 'pending'}
                    >
                        {phase === 'pending' ? (
                            <><span className={styles.spinner} /> PROCESSING...</>
                        ) : (
                            `WITHDRAW ${numAmount > 0 ? `$${numAmount.toLocaleString()}` : ''}`
                        )}
                    </button>
                </>
            )}
        </HoloPanel>
    );
}
