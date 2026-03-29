import styles from './Badge.module.css';

type BadgeVariant = 'green' | 'amber' | 'red' | 'cyan' | 'muted';

interface BadgeProps {
    variant?: BadgeVariant;
    pulse?: boolean;
    children: React.ReactNode;
}

export function Badge({ variant = 'cyan', pulse, children }: BadgeProps) {
    return (
        <span className={`${styles.badge} ${styles[variant]} ${pulse ? styles.pulse : ''}`}>
            {children}
        </span>
    );
}
