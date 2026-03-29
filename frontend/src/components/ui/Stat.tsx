import styles from './Stat.module.css';

interface StatProps { label: string; value: string | number; delta?: string; deltaType?: 'up' | 'down' | 'neutral'; }

export function Stat({ label, value, delta, deltaType = 'neutral' }: StatProps) {
    return (
        <div className={styles.stat}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{value}</span>
            {delta && <span className={`${styles.delta} ${styles[deltaType]}`}>{delta}</span>}
        </div>
    );
}
