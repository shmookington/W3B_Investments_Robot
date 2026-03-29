'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';

type Phase = 'idle' | 'authenticating' | 'granted' | 'denied';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setPhase('authenticating');

        try {
            await login(username, password);
            setPhase('granted');
            // Brief delay to show "ACCESS GRANTED" before redirect
            setTimeout(() => router.push('/dashboard'), 1200);
        } catch (err) {
            setPhase('denied');
            setError(err instanceof Error ? err.message : 'Authentication failed.');
            setTimeout(() => setPhase('idle'), 2000);
        }
    }, [username, password, login, router]);

    return (
        <div className={styles.page}>
            {/* Scanlines overlay */}
            <div className={styles.scanlines} />

            {/* Grid background */}
            <div className={styles.grid} />

            <div className={styles.terminal}>
                {/* Terminal header bar */}
                <div className={styles.terminalHeader}>
                    <span className={styles.dot} data-color="red" />
                    <span className={styles.dot} data-color="yellow" />
                    <span className={styles.dot} data-color="green" />
                    <span className={styles.terminalTitle}>W3B • SECURE TERMINAL</span>
                </div>

                {/* Boot sequence overlay */}
                {phase !== 'idle' && (
                    <div className={`${styles.bootOverlay} ${styles[phase]}`}>
                        {phase === 'authenticating' && (
                            <>
                                <div className={styles.spinner} />
                                <p className={styles.bootText}>AUTHENTICATING...</p>
                                <p className={styles.bootSub}>Verifying credentials</p>
                            </>
                        )}
                        {phase === 'granted' && (
                            <>
                                <div className={styles.checkmark}>✓</div>
                                <p className={styles.bootText}>ACCESS GRANTED</p>
                                <p className={styles.bootSub}>Initializing terminal...</p>
                            </>
                        )}
                        {phase === 'denied' && (
                            <>
                                <div className={styles.xmark}>✗</div>
                                <p className={styles.bootText}>ACCESS DENIED</p>
                                <p className={styles.bootSub}>{error}</p>
                            </>
                        )}
                    </div>
                )}

                {/* Login form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.logoSection}>
                        <h1 className={styles.logo}>W3B</h1>
                        <p className={styles.subtitle}>SECURE ACCESS TERMINAL</p>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="username">
                            <span className={styles.labelPrefix}>&gt;</span> USERNAME
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={styles.input}
                            placeholder="Enter username"
                            required
                            autoComplete="username"
                            disabled={phase !== 'idle'}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="password">
                            <span className={styles.labelPrefix}>&gt;</span> PASSWORD
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="••••••••••••"
                            required
                            autoComplete="current-password"
                            disabled={phase !== 'idle'}
                        />
                    </div>

                    {error && phase === 'idle' && (
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={phase !== 'idle' || !username || !password}
                    >
                        ACCESS TERMINAL
                    </button>

                    <div className={styles.links}>
                        <Link href="/forgot-password" className={styles.link}>
                            FORGOT PASSWORD?
                        </Link>
                    </div>

                    <div className={styles.links}>
                        <Link href="/register" className={styles.link}>
                            CREATE ACCOUNT →
                        </Link>
                        <Link href="/" className={styles.link}>
                            ← BACK TO HOME
                        </Link>
                    </div>
                </form>

                {/* Terminal footer */}
                <div className={styles.terminalFooter}>
                    <span>W3B FUND v1.0</span>
                    <span>ENCRYPTED CONNECTION</span>
                    <span className={styles.statusDot}>● SECURE</span>
                </div>
            </div>
        </div>
    );
}
