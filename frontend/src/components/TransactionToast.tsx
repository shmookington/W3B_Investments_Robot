'use client';

import { type TxPhase } from '@/hooks/useTransaction';
import { type UserError } from '@/lib/errors';
import styles from './TransactionToast.module.css';

interface Props {
    phase: TxPhase;
    hash: string | null;
    error: UserError | null;
    onRetry?: () => void;
    onDismiss?: () => void;
    basescanUrl?: string;
}

/**
 * TransactionToast — displays transaction lifecycle status:
 *   pending → submitted → confirmed / failed
 */
export function TransactionToast({ phase, hash, error, onRetry, onDismiss, basescanUrl = 'https://basescan.org' }: Props) {
    if (phase === 'idle') return null;

    return (
        <div className={`${styles.toast} ${styles[phase]}`}>
            <div className={styles.content}>
                {/* PENDING */}
                {phase === 'pending' && (
                    <>
                        <span className={styles.spinner} />
                        <span className={styles.text}>Waiting for wallet confirmation…</span>
                    </>
                )}

                {/* SUBMITTED */}
                {phase === 'submitted' && (
                    <>
                        <span className={styles.spinner} />
                        <div className={styles.col}>
                            <span className={styles.text}>Transaction submitted. Waiting for confirmation…</span>
                            {hash && (
                                <a href={`${basescanUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className={styles.hashLink}>
                                    {hash.slice(0, 10)}…{hash.slice(-8)}
                                </a>
                            )}
                        </div>
                    </>
                )}

                {/* CONFIRMED */}
                {phase === 'confirmed' && (
                    <>
                        <span className={styles.checkmark}>✓</span>
                        <div className={styles.col}>
                            <span className={styles.text}>Success!</span>
                            {hash && (
                                <a href={`${basescanUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className={styles.hashLink}>
                                    View on Basescan →
                                </a>
                            )}
                        </div>
                    </>
                )}

                {/* FAILED */}
                {phase === 'failed' && error && (
                    <>
                        <span className={styles.errorIcon}>✕</span>
                        <div className={styles.col}>
                            <span className={styles.errorTitle}>{error.title}</span>
                            <span className={styles.errorMsg}>{error.message}</span>
                            {onRetry && error.cta && (
                                <button className={styles.retryBtn} onClick={onRetry}>{error.cta.label}</button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {onDismiss && (
                <button className={styles.dismiss} onClick={onDismiss}>×</button>
            )}
        </div>
    );
}
