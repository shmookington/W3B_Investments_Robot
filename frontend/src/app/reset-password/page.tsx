'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/page.module.css';

type Phase = 'idle' | 'resetting' | 'success' | 'error';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 12) {
            setError('Password must be at least 12 characters.');
            return;
        }

        setPhase('resetting');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setPhase('success');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err) {
            setPhase('error');
            setError(err instanceof Error ? err.message : 'Reset failed.');
            setTimeout(() => setPhase('idle'), 2500);
        }
    };

    if (!token) {
        return (
            <div className={styles.page}>
                <div className={styles.scanlines} />
                <div className={styles.grid} />
                <div className={styles.terminal}>
                    <div className={styles.terminalHeader}>
                        <span className={styles.dot} data-color="red" />
                        <span className={styles.dot} data-color="yellow" />
                        <span className={styles.dot} data-color="green" />
                        <span className={styles.terminalTitle}>W3B • ERROR</span>
                    </div>
                    <div className={styles.form}>
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠</span> Invalid or missing reset token.
                        </div>
                        <Link href="/forgot-password" className={styles.link}>REQUEST NEW RESET LINK →</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.scanlines} />
            <div className={styles.grid} />

            <div className={styles.terminal}>
                <div className={styles.terminalHeader}>
                    <span className={styles.dot} data-color="red" />
                    <span className={styles.dot} data-color="yellow" />
                    <span className={styles.dot} data-color="green" />
                    <span className={styles.terminalTitle}>W3B • SET NEW PASSWORD</span>
                </div>

                {phase !== 'idle' && (
                    <div className={`${styles.bootOverlay} ${phase === 'resetting' ? styles.authenticating : phase === 'success' ? styles.granted : styles.denied}`}>
                        {phase === 'resetting' && (
                            <>
                                <div className={styles.spinner} />
                                <p className={styles.bootText}>RESETTING...</p>
                                <p className={styles.bootSub}>Updating credentials</p>
                            </>
                        )}
                        {phase === 'success' && (
                            <>
                                <div className={styles.checkmark}>✓</div>
                                <p className={styles.bootText}>PASSWORD UPDATED</p>
                                <p className={styles.bootSub}>Redirecting to login...</p>
                            </>
                        )}
                        {phase === 'error' && (
                            <>
                                <div className={styles.xmark}>✗</div>
                                <p className={styles.bootText}>RESET FAILED</p>
                                <p className={styles.bootSub}>{error}</p>
                            </>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.logoSection}>
                        <h1 className={styles.logo}>W3B</h1>
                        <p className={styles.subtitle}>SET NEW PASSWORD</p>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="password">
                            <span className={styles.labelPrefix}>&gt;</span> NEW PASSWORD
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Minimum 12 characters"
                            required
                            minLength={12}
                            disabled={phase !== 'idle'}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="confirm">
                            <span className={styles.labelPrefix}>&gt;</span> CONFIRM PASSWORD
                        </label>
                        <input
                            id="confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Re-enter password"
                            required
                            minLength={12}
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
                        disabled={phase !== 'idle' || !password || !confirmPassword}
                    >
                        UPDATE PASSWORD
                    </button>

                    <div className={styles.links}>
                        <Link href="/login" className={styles.link}>← BACK TO LOGIN</Link>
                    </div>
                </form>

                <div className={styles.terminalFooter}>
                    <span>W3B PROTOCOL v1.0</span>
                    <span>ENCRYPTED CONNECTION</span>
                    <span className={styles.statusDot}>● SECURE</span>
                </div>
            </div>
        </div>
    );
}
