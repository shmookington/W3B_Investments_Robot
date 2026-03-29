/**
 * useAuth Hook — In-House Auth (NextAuth)
 *
 * Returns:  { user, role, isAdmin, isLoading, login, register, logout }
 * All auth is handled locally — no third-party services.
 */
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';

export type UserRole = 'admin' | 'customer';

export function useAuth() {
    const { data: session, status } = useSession();

    const isLoading = status === 'loading';
    const user = session?.user ?? null;
    const role = ((user as { role?: string })?.role || 'customer') as UserRole;
    const isAdmin = role === 'admin';

    // Login with username + password
    const login = useCallback(async (username: string, password: string) => {
        const result = await signIn('credentials', {
            username,
            password,
            redirect: false,
        });

        if (result?.error) {
            throw new Error('Invalid username or password.');
        }

        return result;
    }, []);

    // Register new customer account
    const register = useCallback(async (username: string, password: string) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Registration failed.');
        }

        // Auto-login after registration
        await signIn('credentials', { username, password, redirect: false });
        return data;
    }, []);

    // Logout
    const logout = useCallback(async () => {
        await signOut({ redirect: false });
    }, []);

    return {
        user,
        role,
        isAdmin,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
    };
}
