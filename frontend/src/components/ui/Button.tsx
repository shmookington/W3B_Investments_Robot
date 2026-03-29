import { forwardRef } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'success' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, fullWidth, disabled, className, children, ...props }, ref) => {
        const classes = [
            styles.btn,
            styles[variant],
            size !== 'md' && styles[size],
            loading && styles.loading,
            disabled && styles.disabled,
            fullWidth && styles.fullWidth,
            className,
        ].filter(Boolean).join(' ');

        return (
            <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
                {loading && <span className={styles.spinner} />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';
