import { forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className, ...props }, ref) => {
        return (
            <div className={`${styles.inputGroup} ${error ? styles.error : ''} ${className || ''}`}>
                {label && <label className={styles.label}>{label}</label>}
                <input ref={ref} className={styles.input} {...props} />
                {error && <span className={styles.errorText}>{error}</span>}
                {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
            </div>
        );
    }
);
Input.displayName = 'Input';
