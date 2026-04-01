'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { VaultLayout } from '@/components/ui/VaultLayout';
import { ExecutionButton } from '@/components/ui/ExecutionButton';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<VaultLayout title="INITIALIZING SECURE CONTEXT..."><div/></VaultLayout>}>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Keys do not match.');
            return;
        }

        if (password.length < 12) {
            setError('Key entropy insufficient. Minimum 12 characters.');
            return;
        }

        setStatus('[SYSTEM] Mutating credential tree...');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStatus('[SYSTEM] Operation successful. Link severed.');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mutation failed.');
            setStatus(null);
        }
    };

    const inputStyle = {
      width: '100%',
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid rgba(244, 244, 245, 0.2)',
      color: 'var(--text-platinum)',
      fontSize: '14px',
      padding: '12px 0',
      outline: 'none',
      fontFamily: 'var(--font-mono)',
      transition: 'border-color 0.2s',
      marginBottom: '32px'
    };

    if (!token) {
        return (
            <VaultLayout title="LINK TERMINATED">
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{
                        color: 'var(--data-negative)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        marginBottom: '32px',
                        letterSpacing: '0.05em'
                    }}>
                        [ERROR] Handshake failed. Identifier missing or expired.
                    </div>
                    
                    <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                        <ExecutionButton style={{ width: '100%', padding: '16px 0', letterSpacing: '0.2em', fontSize: '11px' }}>
                            REQUEST NEW LINK
                        </ExecutionButton>
                    </Link>
                </div>
            </VaultLayout>
        );
    }

    return (
        <VaultLayout title="SET CREDENTIALS">
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="GENERATE KEY (MIN 12)"
                    required
                    minLength={12}
                    disabled={!!status}
                />

                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="VERIFY KEY"
                    required
                    minLength={12}
                    disabled={!!status}
                />

                {error && (
                    <div style={{
                        color: 'var(--data-negative)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        marginBottom: '24px',
                        letterSpacing: '0.05em'
                    }}>
                        [ERROR] {error}
                    </div>
                )}

                {status && (
                    <div style={{
                        color: 'var(--accent-gold-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        marginBottom: '24px',
                        letterSpacing: '0.05em'
                    }}>
                        {status}
                    </div>
                )}

                <ExecutionButton 
                    type="submit" 
                    disabled={!!status || !password || !confirmPassword}
                    style={{ width: '100%', padding: '16px 0', letterSpacing: '0.2em', fontSize: '11px' }}
                >
                    UPDATE STORE
                </ExecutionButton>

                <div style={{ 
                    marginTop: '40px', 
                    display: 'flex', 
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.05em'
                }}>
                    <Link href="/login" style={{ color: 'rgba(244, 244, 245, 0.4)', textDecoration: 'none' }}>
                        ← ABORT SEQUENCE
                    </Link>
                </div>
            </form>
        </VaultLayout>
    );
}
