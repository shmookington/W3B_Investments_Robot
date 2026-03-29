'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../login/page.module.css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.scanlines} />
            <div className={styles.grid} />

            <div className={styles.terminal}>
                <div className={styles.terminalHeader}>
                    <span className={styles.dot} data-color="red" />
                    <span className={styles.dot} data-color="yellow" />
                    <span className={styles.dot} data-color="green" />
                    <span className={styles.terminalTitle}>W3B • PASSWORD RECOVERY</span>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.logoSection}>
                        <h1 className={styles.logo}>W3B</h1>
                        <p className={styles.subtitle}>PASSWORD RECOVERY TERMINAL</p>
                    </div>

                    {sent ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className={styles.checkmark} style={{ fontSize: '2rem', color: '#28ca41', marginBottom: '12px' }}>✓</div>
                            <p style={{ color: '#0ff', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                                RESET LINK TRANSMITTED
                            </p>
                            <p style={{ color: 'rgba(0,255,255,0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', marginTop: '8px', letterSpacing: '0.05em' }}>
                                If an account exists for {email}, a password reset link has been sent.
                            </p>
                            <Link href="/login" className={styles.link} style={{ display: 'block', marginTop: '24px' }}>
                                ← BACK TO LOGIN
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p style={{ color: 'rgba(0,255,255,0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textAlign: 'center', letterSpacing: '0.05em' }}>
                                Enter your email address and we&apos;ll send you a secure reset link.
                            </p>

                            <div className={styles.field}>
                                <label className={styles.label} htmlFor="email">
                                    <span className={styles.labelPrefix}>&gt;</span> EMAIL
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    placeholder="your@email.com"
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className={styles.error}>
                                    <span className={styles.errorIcon}>⚠</span> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={loading || !email}
                            >
                                {loading ? 'TRANSMITTING...' : 'SEND RESET LINK'}
                            </button>

                            <div className={styles.links}>
                                <Link href="/login" className={styles.link}>← BACK TO LOGIN</Link>
                                <Link href="/register" className={styles.link}>CREATE ACCOUNT →</Link>
                            </div>
                        </>
                    )}
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
