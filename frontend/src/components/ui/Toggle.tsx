'use client';
import styles from './Toggle.module.css';

interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; }

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
    return (
        <label className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}>
            <button
                role="switch"
                aria-checked={checked}
                className={`${styles.track} ${checked ? styles.on : ''}`}
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
            >
                <span className={styles.thumb} />
            </button>
            {label && <span className={styles.label}>{label}</span>}
        </label>
    );
}
