'use client';

import { useState } from 'react';
import styles from './TransactionButton.module.css';

type TxPhase = 'idle' | 'approving' | 'executing' | 'confirming' | 'success' | 'error';

interface TransactionButtonProps {
    label: string;
    approveLabel?: string;
    onApprove?: () => Promise<void>;
    onExecute: () => Promise<void>;
    disabled?: boolean;
    needsApproval?: boolean;
}

export function TransactionButton({
    label,
    approveLabel = 'APPROVE',
    onApprove,
    onExecute,
    disabled,
    needsApproval,
}: TransactionButtonProps) {
    const [phase, setPhase] = useState<TxPhase>('idle');
    const [error, setError] = useState('');

    const handleClick = async () => {
        try {
            setError('');
            if (needsApproval && onApprove && phase === 'idle') {
                setPhase('approving');
                await onApprove();
                setPhase('idle');
                return;
            }
            setPhase('executing');
            await onExecute();
            setPhase('confirming');
            // Simulate confirmation delay
            await new Promise((r) => setTimeout(r, 2000));
            setPhase('success');
            setTimeout(() => setPhase('idle'), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed');
            setPhase('error');
            setTimeout(() => setPhase('idle'), 4000);
        }
    };

    const isLoading = phase === 'approving' || phase === 'executing' || phase === 'confirming';
    const btnLabel =
        phase === 'approving' ? 'APPROVING...' :
            phase === 'executing' ? 'EXECUTING...' :
                phase === 'confirming' ? 'CONFIRMING...' :
                    phase === 'success' ? '✓ SUCCESS' :
                        phase === 'error' ? '✕ FAILED' :
                            needsApproval ? approveLabel : label;

    return (
        <div className={styles.wrapper}>
            <button
                className={`${styles.btn} ${styles[phase]}`}
                onClick={handleClick}
                disabled={disabled || isLoading}
            >
                {isLoading && <span className={styles.spinner} />}
                {btnLabel}
            </button>
            {error && <span className={styles.error}>{error}</span>}
        </div>
    );
}
