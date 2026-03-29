'use client';

import { useState, useCallback } from 'react';
import { HoloPanel } from './HoloPanel';
import styles from './DepositWidget.module.css';

interface DepositWidgetProps {
    /** User's account balance */
    walletBalance?: number;
    /** Callback when deposit is confirmed */
    onDeposit: (amount: number) => Promise<void>;
}

type Phase = 'idle' | 'confirming' | 'pending' | 'success' | 'error';

/**
 * DepositWidget — Vault deposit flow with risk disclosure.
 */
export function DepositWidget({ walletBalance = 0, onDeposit }: DepositWidgetProps) {
    const [amount, setAmount] = useState('');
    const [riskAcknowledged, setRiskAcknowledged] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');

    const numAmount = Number(amount) || 0;
    const isValid = numAmount > 0 && numAmount <= walletBalance && riskAcknowledged;

    const handleDeposit = useCallback(async () => {
        if (!isValid) return;
        setPhase('pending');
        setError('');
        try {
            await onDeposit(numAmount);
            setPhase('success');
            setAmount('');
            setRiskAcknowledged(false);
            setTimeout(() => setPhase('idle'), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Deposit failed');
            setPhase('error');
            setTimeout(() => setPhase('idle'), 3000);
        }
    }, [isValid, numAmount, onDeposit]);

    return (
        <HoloPanel size="md" depth="foreground" glow={phase === 'success' ? 'green' : 'cyan'} header="DEPOSIT USD">
            {phase === 'success' ? (
                <div className={styles.successState}>
                    <span className={styles.checkmark}>✓</span>
                    <p className={styles.successText}>DEPOSIT CONFIRMED</p>
                    <p className={styles.successSub}>Your capital has been deployed.</p>
                </div>
            ) : (
                <>
                    {/* Amount input */}
                    <div className={styles.field}>
                        <label className={styles.label}>AMOUNT</label>
                        <div className={styles.inputRow}>
                            <input
                                type="number"
                                className={styles.input}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                min={0}
                                disabled={phase === 'pending'}
                            />
                            <span className={styles.token}>USD</span>
                        </div>
                        <div className={styles.balanceRow}>
                            <span>Balance: ${walletBalance.toLocaleString()}</span>
                            <button
                                className={styles.maxBtn}
                                onClick={() => setAmount(String(walletBalance))}
                                disabled={phase === 'pending'}
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {/* Fee summary */}
                    <div className={styles.feeSummary}>
                        <div className={styles.feeRow}>
                            <span>Deposit Fee</span>
                            <span className={styles.feeHighlight}>0%</span>
                        </div>
                        <div className={styles.feeRow}>
                            <span>Management Fee</span>
                            <span className={styles.feeHighlight}>0%</span>
                        </div>
                        <div className={styles.feeRow}>
                            <span>Performance Fee</span>
                            <span>20% (on profits above HWM)</span>
                        </div>
                    </div>

                    {/* Risk acknowledgment */}
                    <label className={styles.riskCheck}>
                        <input
                            type="checkbox"
                            checked={riskAcknowledged}
                            onChange={(e) => setRiskAcknowledged(e.target.checked)}
                            disabled={phase === 'pending'}
                        />
                        <span>
                            I understand that past performance does not guarantee future results and I may lose
                            some or all of my deposit.
                        </span>
                    </label>

                    {/* Error */}
                    {error && <div className={styles.error}>⚠ {error}</div>}

                    {/* Confirm button */}
                    <button
                        className={`${styles.submitBtn} ${phase === 'pending' ? styles.submitting : ''}`}
                        onClick={handleDeposit}
                        disabled={!isValid || phase === 'pending'}
                    >
                        {phase === 'pending' ? (
                            <><span className={styles.spinner} /> PROCESSING...</>
                        ) : (
                            `DEPOSIT ${numAmount > 0 ? `$${numAmount.toLocaleString()}` : ''}`
                        )}
                    </button>
                </>
            )}
        </HoloPanel>
    );
}
