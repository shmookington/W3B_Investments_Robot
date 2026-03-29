'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from '../login/page.module.css';

type Phase = 'idle' | 'creating' | 'success' | 'error';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

        if (!agreedToTerms) {
            setError('You must accept the terms and risk disclaimer.');
            return;
        }

        setPhase('creating');

        try {
            await register(email, password);
            setPhase('success');
            setTimeout(() => router.push('/dashboard'), 1500);
        } catch (err) {
            setPhase('error');
            setError(err instanceof Error ? err.message : 'Registration failed.');
            setTimeout(() => setPhase('idle'), 2500);
        }
    }, [email, password, confirmPassword, agreedToTerms, register, router]);

    // Password strength indicator
    const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : password.length < 16 ? 3 : 4;
    const strengthLabel = ['', 'WEAK', 'FAIR', 'STRONG', 'EXCELLENT'][strength];
    const strengthColor = ['', '#ff4d6a', '#ffbd2e', '#0ff', '#28ca41'][strength];

    return (
        <div className={styles.page}>
            <div className={styles.scanlines} />
            <div className={styles.grid} />

            <div className={styles.terminal}>
                <div className={styles.terminalHeader}>
                    <span className={styles.dot} data-color="red" />
                    <span className={styles.dot} data-color="yellow" />
                    <span className={styles.dot} data-color="green" />
                    <span className={styles.terminalTitle}>W3B • NEW ACCOUNT</span>
                </div>

                {/* Boot sequence overlay */}
                {phase !== 'idle' && (
                    <div className={`${styles.bootOverlay} ${phase === 'creating' ? styles.authenticating : phase === 'success' ? styles.granted : styles.denied}`}>
                        {phase === 'creating' && (
                            <>
                                <div className={styles.spinner} />
                                <p className={styles.bootText}>INITIALIZING...</p>
                                <p className={styles.bootSub}>Creating secure account</p>
                            </>
                        )}
                        {phase === 'success' && (
                            <>
                                <div className={styles.checkmark}>✓</div>
                                <p className={styles.bootText}>ACCOUNT CREATED</p>
                                <p className={styles.bootSub}>Welcome to the W3B Fund</p>
                            </>
                        )}
                        {phase === 'error' && (
                            <>
                                <div className={styles.xmark}>✗</div>
                                <p className={styles.bootText}>INITIALIZATION FAILED</p>
                                <p className={styles.bootSub}>{error}</p>
                            </>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.logoSection}>
                        <h1 className={styles.logo}>W3B</h1>
                        <p className={styles.subtitle}>ACCOUNT INITIALIZATION</p>
                    </div>

                    {/* Email */}
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
                            disabled={phase !== 'idle'}
                        />
                    </div>

                    {/* Password */}
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
                            placeholder="Minimum 12 characters"
                            required
                            minLength={12}
                            autoComplete="new-password"
                            disabled={phase !== 'idle'}
                        />
                        {password.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <div style={{ flex: 1, height: '3px', background: 'rgba(0,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${strength * 25}%`, height: '100%', background: strengthColor, transition: 'all 0.3s', borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: strengthColor, letterSpacing: '0.1em' }}>
                                    {strengthLabel}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
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
                            autoComplete="new-password"
                            disabled={phase !== 'idle'}
                        />
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#ff4d6a', letterSpacing: '0.05em', marginTop: '2px' }}>
                                PASSWORDS DO NOT MATCH
                            </span>
                        )}
                    </div>

                    {/* Terms checkbox */}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            disabled={phase !== 'idle'}
                            style={{ marginTop: '2px', accentColor: '#0ff' }}
                        />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(0,255,255,0.5)', lineHeight: 1.5, letterSpacing: '0.03em' }}>
                            I acknowledge the risks of fund investments and agree to the{' '}
                            <Link href="/legal/terms" style={{ color: '#0ff', textDecoration: 'underline' }}>Terms of Service</Link>{' '}
                            and{' '}
                            <Link href="/legal/risk" style={{ color: '#0ff', textDecoration: 'underline' }}>Risk Disclaimer</Link>.
                        </span>
                    </label>

                    {error && phase === 'idle' && (
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={phase !== 'idle' || !email || !password || !confirmPassword || !agreedToTerms}
                    >
                        INITIALIZE ACCOUNT
                    </button>

                    <div className={styles.links}>
                        <Link href="/login" className={styles.link}>
                            ← ALREADY HAVE AN ACCOUNT
                        </Link>
                        <Link href="/" className={styles.link}>
                            BACK TO HOME
                        </Link>
                    </div>
                </form>

                <div className={styles.terminalFooter}>
                    <span>W3B FUND v1.0</span>
                    <span>ENCRYPTED CONNECTION</span>
                    <span className={styles.statusDot}>● SECURE</span>
                </div>
            </div>
        </div>
    );
}
