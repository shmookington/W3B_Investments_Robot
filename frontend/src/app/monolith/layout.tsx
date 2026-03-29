/**
 * MONOLITH Admin Layout
 *
 * Wraps all /monolith/* routes with AdminGate.
 * Only admin users can access the ops terminal.
 * Customers/unauthenticated users see AccessDenied and get redirected.
 */
'use client';

import { AuthGate } from '@/components/AuthGate';
import { AccessDenied } from '@/components/AccessDenied';

export default function MonolithLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGate role="admin" fallback={<AccessDenied />}>
            {children}
        </AuthGate>
    );
}
