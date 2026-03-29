'use client';

import { useVerificationStore } from '@/hooks/useIdentity';
import type { VerificationStatus } from '@/types/identity';
import styles from './VerificationBadge.module.css';

interface VerificationBadgeProps {
    /** Override click handler (e.g., to open verification modal) */
    onClick?: () => void;
    /** Show full label or compact */
    compact?: boolean;
}

const STATUS_LABELS: Record<VerificationStatus, string> = {
    verified: 'Verified Human',
    pending: 'Verifying...',
    unverified: 'Unverified',
    expired: 'Expired',
};

const STATUS_ICONS: Record<VerificationStatus, string> = {
    verified: '✓',
    pending: '◌',
    unverified: '○',
    expired: '✕',
};

export function VerificationBadge({ onClick, compact = false }: VerificationBadgeProps) {
    const { verification } = useVerificationStore();
    const { status, provider } = verification;

    const statusClass = styles[status] || styles.unverified;
    const dotClass = styles[`dot${status.charAt(0).toUpperCase() + status.slice(1)}`] || styles.dotUnverified;

    return (
        <button
            className={`${styles.badge} ${statusClass} ${onClick ? styles.clickable : ''}`}
            onClick={onClick}
            type="button"
            title={
                status === 'verified'
                    ? `Verified via ${provider === 'privado' ? 'Privado ID (ZK)' : 'Quadrata'}`
                    : status === 'unverified'
                        ? 'Click to verify your identity'
                        : undefined
            }
        >
            <span className={`${styles.dot} ${dotClass}`} />
            {!compact && (
                <span>
                    {STATUS_ICONS[status]} {STATUS_LABELS[status]}
                </span>
            )}
            {compact && <span>{STATUS_ICONS[status]}</span>}
        </button>
    );
}
