import styles from './ProgressBar.module.css';

interface ProgressBarProps { value: number; max?: number; variant?: 'cyan' | 'green' | 'amber' | 'red'; label?: string; }

export function ProgressBar({ value, max = 100, variant = 'green', label }: ProgressBarProps) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={styles.wrapper}>
            {label && <span className={styles.label}>{label}</span>}
            <div className={styles.track}>
                <div className={`${styles.fill} ${styles[variant]}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
