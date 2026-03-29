'use client';

import { Component, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

/**
 * Global React Error Boundary
 * Catches render errors and shows a user-friendly fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className={styles.boundary}>
                    <div className={styles.panel}>
                        <span className={styles.icon}>⚠</span>
                        <h2 className={styles.title}>SYSTEM ERROR</h2>
                        <p className={styles.message}>
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button
                            className={styles.retryBtn}
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
