/**
 * AuthGate — Role-Based Access Control Component
 *
 * Wraps content that requires a specific role.
 * If the user doesn't have the required role, renders the fallback.
 * Shows a boot sequence when admin access is first granted.
 *
 * Usage:
 *   <AuthGate role="admin" fallback={<AccessDenied />}>
 *     <AdminDashboard />
 *   </AuthGate>
 */
'use client';

import { useAuth, type UserRole } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, type ReactNode } from 'react';

interface AuthGateProps {
    /** Required role to view children */
    role: UserRole;
    /** Content to show if authorized */
    children: ReactNode;
    /** Content to show if NOT authorized (optional — defaults to redirect) */
    fallback?: ReactNode;
    /** Redirect path when not authorized (default: /login for unauth, /dashboard for wrong role) */
    redirectTo?: string;
}

/* ─── Boot Sequence (admin only) ─── */
const BOOT_LINES = [
    '> AUTHENTICATING OPERATOR CREDENTIALS...',
    '> ROLE: ADMIN — VERIFIED',
    '> LOADING MONOLITH TERMINAL...',
    '> OPERATOR ACCESS GRANTED • FULL TERMINAL UNLOCKED',
];

function BootSequence({ onComplete }: { onComplete: () => void }) {
    const [lines, setLines] = useState<string[]>([]);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        BOOT_LINES.forEach((line, i) => {
            timers.push(setTimeout(() => setLines(prev => [...prev, line]), (i + 1) * 400));
        });
        timers.push(setTimeout(() => setDone(true), BOOT_LINES.length * 400 + 600));
        timers.push(setTimeout(onComplete, BOOT_LINES.length * 400 + 1200));
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '8px',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            opacity: done ? 0 : 1,
            transition: 'opacity 0.6s ease',
        }}>
            {lines.map((line, i) => (
                <span key={i} style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    color: i === lines.length - 1 ? '#39ff14' : 'rgba(0, 240, 255, 0.4)',
                    textShadow: i === lines.length - 1 ? '0 0 12px rgba(57, 255, 20, 0.3)' : 'none',
                }}>
                    {line}
                </span>
            ))}
        </div>
    );
}

export function AuthGate({ role, children, fallback, redirectTo }: AuthGateProps) {
    const { user, role: userRole, isLoading } = useAuth();
    const router = useRouter();
    const [showBoot, setShowBoot] = useState(false);
    const [bootComplete, setBootComplete] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        // Not logged in → redirect to login
        if (!user && !fallback) {
            router.replace(redirectTo || '/login');
            return;
        }

        // Logged in but wrong role → redirect to dashboard
        if (user && role === 'admin' && userRole !== 'admin' && !fallback) {
            router.replace(redirectTo || '/dashboard');
        }
    }, [user, userRole, role, isLoading, router, fallback, redirectTo]);

    // Show boot sequence once per session for admin gates
    useEffect(() => {
        if (isLoading || !user || (role === 'admin' && userRole !== 'admin')) return;
        if (role === 'admin') {
            const key = 'w3b_admin_boot_shown';
            if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
                setShowBoot(true);
                sessionStorage.setItem(key, '1');
            } else {
                setBootComplete(true);
            }
        } else {
            setBootComplete(true);
        }
    }, [isLoading, user, role, userRole]);

    const handleBootComplete = useCallback(() => {
        setShowBoot(false);
        setBootComplete(true);
    }, []);

    // Loading
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: 'var(--color-holo-cyan, #0ff)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>AUTHENTICATING...</span>
            </div>
        );
    }

    // Not logged in
    if (!user) return fallback ? <>{fallback}</> : null;

    // Wrong role
    if (role === 'admin' && userRole !== 'admin') return fallback ? <>{fallback}</> : null;

    // Boot sequence
    if (showBoot && !bootComplete) {
        return <BootSequence onComplete={handleBootComplete} />;
    }

    // Authorized
    return <>{children}</>;
}

/**
 * RequireLogin — Simpler wrapper that just requires any logged-in user.
 */
export function RequireLogin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user && !fallback) {
            router.replace('/login');
        }
    }, [user, isLoading, router, fallback]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: 'var(--color-holo-cyan, #0ff)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>LOADING SESSION...</span>
            </div>
        );
    }

    if (!user) return fallback ? <>{fallback}</> : null;

    return <>{children}</>;
}
