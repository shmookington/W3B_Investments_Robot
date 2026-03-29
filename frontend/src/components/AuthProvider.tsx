/**
 * SessionProvider Wrapper
 *
 * Wraps the app with NextAuth's SessionProvider for useSession() to work.
 * Import and use in the root layout.
 */
'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
