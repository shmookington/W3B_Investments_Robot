'use client';

import { useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─── Auth State (persisted to localStorage) ─── */
interface AuthState {
    isAuthenticated: boolean;
    address: string | null;
    sessionExpiry: number | null;
    setAuth: (address: string, expiry: number) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            address: null,
            sessionExpiry: null,
            setAuth: (address, expiry) =>
                set({ isAuthenticated: true, address, sessionExpiry: expiry }),
            clearAuth: () =>
                set({ isAuthenticated: false, address: null, sessionExpiry: null }),
        }),
        { name: 'w3b-auth' }
    )
);

/* ─── SIWE Hook ─── */
export function useSIWE() {
    const { address, isConnected, chain } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { isAuthenticated, sessionExpiry, setAuth, clearAuth } = useAuthStore();

    // Auto-clear auth when wallet disconnects or address changes
    useEffect(() => {
        if (!isConnected) {
            clearAuth();
        }
    }, [isConnected, clearAuth]);

    // Check session expiry
    useEffect(() => {
        if (sessionExpiry && Date.now() > sessionExpiry) {
            clearAuth();
        }
    }, [sessionExpiry, clearAuth]);

    const signIn = useCallback(async () => {
        if (!address || !chain) return;

        const message = new SiweMessage({
            domain: window.location.host,
            address,
            statement: 'Sign in to W3B — The Sovereign Bank',
            uri: window.location.origin,
            version: '1',
            chainId: chain.id,
            nonce: Math.random().toString(36).substring(2, 15),
            issuedAt: new Date().toISOString(),
            expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        });

        const messageToSign = message.prepareMessage();

        try {
            await signMessageAsync({ message: messageToSign });
            // In production, send signature + message to backend for verification
            // For now, set auth on successful sign
            setAuth(address, Date.now() + 24 * 60 * 60 * 1000);
        } catch {
            // User rejected signature
            clearAuth();
        }
    }, [address, chain, signMessageAsync, setAuth, clearAuth]);

    const signOut = useCallback(() => {
        clearAuth();
    }, [clearAuth]);

    return {
        isAuthenticated,
        signIn,
        signOut,
        address: isAuthenticated ? address : null,
    };
}
