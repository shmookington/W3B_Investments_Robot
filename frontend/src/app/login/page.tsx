'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { VaultLayout } from '@/components/ui/VaultLayout';
import { ExecutionButton } from '@/components/ui/ExecutionButton';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setStatus('[AUTH] Verifying payload...');

        try {
            await login(username, password);
            setStatus('[AUTH] Verification complete. Allocating session tokens...');
            setTimeout(() => router.push('/monolith'), 1200);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed.');
            setStatus(null);
        }
    }, [username, password, login, router]);

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
        <VaultLayout title="AUTHENTICATION GATEWAY">
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                    placeholder="IDENTIFIER"
                    required
                    autoComplete="username"
                    disabled={!!status}
                />
                
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="KEY"
                    required
                    autoComplete="current-password"
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
                    disabled={!!status || !username || !password}
                    style={{ width: '100%', padding: '16px 0', letterSpacing: '0.2em', fontSize: '11px' }}
                >
                    AUTHENTICATE
                </ExecutionButton>

                <div style={{ 
                    marginTop: '40px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.05em'
                }}>
                    <Link href="/forgot-password" style={{ color: 'rgba(244, 244, 245, 0.4)', textDecoration: 'none' }}>
                        FORCE CREDENTIAL RESET
                    </Link>
                    <Link href="/register" style={{ color: 'rgba(212, 175, 55, 0.8)', textDecoration: 'none' }}>
                        REQUEST ALLOCATION →
                    </Link>
                </div>
            </form>
        </VaultLayout>
    );
}
