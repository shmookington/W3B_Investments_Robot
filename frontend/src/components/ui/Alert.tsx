import styles from './Alert.module.css';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps { variant?: AlertVariant; children: React.ReactNode; className?: string; }

export function Alert({ variant = 'info', children, className }: AlertProps) {
    return <div className={`${styles.alert} ${styles[variant]} ${className || ''}`}>{children}</div>;
}
