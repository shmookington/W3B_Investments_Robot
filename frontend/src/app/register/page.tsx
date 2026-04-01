'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { VaultLayout } from '@/components/ui/VaultLayout';
import { ExecutionButton } from '@/components/ui/ExecutionButton';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

        if (!agreedToTerms) {
            setError('Compliance acknowledgment required.');
            return;
        }

        setStatus('[AUTH] Allocating entity...');

        try {
            await register(email, password);
            setStatus('[AUTH] Entity created. Handshaking vault...');
            setTimeout(() => router.push('/dashboard'), 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Allocation failed.');
            setStatus(null);
        }
    }, [email, password, confirmPassword, agreedToTerms, register, router]);

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

    return (
        <VaultLayout title="ENTITY ALLOCATION">
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="ENTITY ORIGIN (EMAIL)"
                    required
                    autoComplete="email"
                    disabled={!!status}
                />
                
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="GENERATE KEY (MIN 12)"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    disabled={!!status}
                />

                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{...inputStyle, marginBottom: '24px'}}
                    placeholder="VERIFY KEY"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    disabled={!!status}
                />

                <label style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    cursor: 'pointer',
                    marginBottom: '32px' 
                }}>
                    <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        disabled={!!status}
                        style={{ marginTop: '2px', accentColor: 'var(--accent-gold-primary)' }}
                    />
                    <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '9px', 
                        color: 'rgba(244, 244, 245, 0.5)', 
                        lineHeight: 1.6, 
                        letterSpacing: '0.05em' 
                    }}>
                        Entity acknowledges the inherent risks of quantitative liquidity provision and agrees to the{' '}
                        <Link href="/legal/terms" style={{ color: 'var(--accent-gold-primary)', textDecoration: 'none' }}>Operating Architecture</Link>{' '}
                        and{' '}
                        <Link href="/legal/risk" style={{ color: 'var(--accent-gold-primary)', textDecoration: 'none' }}>Volatility Disclaimer</Link>.
                    </span>
                </label>

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
                    disabled={!!status || !email || !password || !confirmPassword || !agreedToTerms}
                    style={{ width: '100%', padding: '16px 0', letterSpacing: '0.2em', fontSize: '11px' }}
                >
                    CREATE ENTITY
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
                        ← RETURN TO GATEWAY
                    </Link>
                </div>
            </form>
        </VaultLayout>
    );
}
