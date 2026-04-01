'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VaultLayout } from '@/components/ui/VaultLayout';
import { ExecutionButton } from '@/components/ui/ExecutionButton';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setStatus('[SYSTEM] Initiating credential override...');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStatus('[SYSTEM] Override payload dispatched. Terminating link.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Dispatch sequence failed.');
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

    return (
        <VaultLayout title="CREDENTIAL OVERRIDE">
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                {status && status.includes('Terminating') ? (
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ 
                            color: 'var(--accent-gold-primary)', 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '11px', 
                            letterSpacing: '0.1em',
                            lineHeight: '1.6'
                        }}>
                            {status}
                        </div>
                    </div>
                ) : (
                    <>
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
                            disabled={!!status || !email}
                            style={{ width: '100%', padding: '16px 0', letterSpacing: '0.2em', fontSize: '11px' }}
                        >
                            FORCE OVERRIDE
                        </ExecutionButton>
                    </>
                )}

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
