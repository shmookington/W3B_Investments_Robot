/**
 * AccessDenied Component
 *
 * Shown when a user tries to access admin-only routes.
 * Styled as a terminal error screen with redirect option.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function AccessDenied() {
    const router = useRouter();
    const { user } = useAuth();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
            padding: '2rem',
            textAlign: 'center',
        }}>
            {/* Glitch border panel */}
            <div style={{
                padding: '40px 48px',
                background: 'rgba(255, 77, 106, 0.04)',
                border: '1px solid rgba(255, 77, 106, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 0 40px rgba(255, 77, 106, 0.06)',
                maxWidth: '500px',
            }}>
                {/* Lock icon */}
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '16px',
                    filter: 'drop-shadow(0 0 12px rgba(255, 77, 106, 0.5))',
                }}>
                    🔒
                </div>

                <h2 style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '1.2rem',
                    color: '#ff4d6a',
                    letterSpacing: '0.25em',
                    margin: '0 0 8px',
                    textTransform: 'uppercase',
                }}>
                    ACCESS RESTRICTED
                </h2>

                <p style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.7rem',
                    color: 'rgba(255, 77, 106, 0.6)',
                    letterSpacing: '0.1em',
                    margin: '0 0 24px',
                }}>
                    OPERATOR CREDENTIALS REQUIRED
                </p>

                <p style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.75rem',
                    color: 'rgba(0, 255, 255, 0.4)',
                    lineHeight: 1.6,
                    margin: '0 0 24px',
                }}>
                    This terminal is restricted to authorized operators only.
                    {!user && ' Please log in with an admin account.'}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => router.push(user ? '/dashboard' : '/login')}
                        style={{
                            padding: '10px 24px',
                            background: 'rgba(0, 255, 255, 0.08)',
                            border: '1px solid rgba(0, 255, 255, 0.25)',
                            borderRadius: '6px',
                            color: '#0ff',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem',
                            letterSpacing: '0.15em',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 255, 0.15)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 255, 0.08)')}
                    >
                        {user ? '← RETURN TO DASHBOARD' : '← GO TO LOGIN'}
                    </button>

                    <button
                        onClick={() => router.push('/')}
                        style={{
                            padding: '10px 24px',
                            background: 'transparent',
                            border: '1px solid rgba(0, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: 'rgba(0, 255, 255, 0.4)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem',
                            letterSpacing: '0.15em',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = '#0ff')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(0, 255, 255, 0.4)')}
                    >
                        BACK TO HOME
                    </button>
                </div>
            </div>

            {/* Terminal-style log line */}
            <p style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.6rem',
                color: 'rgba(255, 77, 106, 0.3)',
                letterSpacing: '0.1em',
            }}>
                [ERR] AUTH_GATE: insufficient_permissions — role=&quot;{user ? 'customer' : 'unauthenticated'}&quot;
            </p>
        </div>
    );
}
