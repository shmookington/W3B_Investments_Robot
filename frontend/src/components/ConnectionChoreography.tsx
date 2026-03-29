'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════
   STATE TYPES
   ═══════════════════════════════════════════════════ */

export type WalletPhase = 'disconnected' | 'connecting' | 'connected';
export type FeedPhase = 'connected' | 'reconnecting' | 'disconnected' | 'recovered';

interface ConnectionState {
    wallet: WalletPhase;
    feed: FeedPhase;
    feedAttempts: number;
    /** Panel activation order tracking */
    activatedPanels: string[];
}

interface ConnectionActions {
    setWalletPhase: (phase: WalletPhase) => void;
    setFeedPhase: (phase: FeedPhase) => void;
    registerPanel: (id: string) => void;
    unregisterPanel: (id: string) => void;
}

type ConnectionCtx = ConnectionState & ConnectionActions;

const ConnectionContext = createContext<ConnectionCtx | null>(null);

export function useConnectionState() {
    const ctx = useContext(ConnectionContext);
    if (!ctx) throw new Error('useConnectionState must be used within ConnectionChoreography');
    return ctx;
}

/* ═══════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════ */

export function ConnectionChoreography({ children }: { children: ReactNode }) {
    const [wallet, setWallet] = useState<WalletPhase>('disconnected');
    const [feed, setFeed] = useState<FeedPhase>('connected');
    const [feedAttempts, setFeedAttempts] = useState(0);
    const [activatedPanels, setActivatedPanels] = useState<string[]>([]);

    const setWalletPhase = useCallback((phase: WalletPhase) => {
        setWallet(phase);
        if (phase === 'connected') {
            // Panels "power on" — trigger stagger in consuming components
            setActivatedPanels((prev) => [...prev]);
        }
        if (phase === 'disconnected') {
            // Panels "power down" in reverse
            setActivatedPanels([]);
        }
    }, []);

    const setFeedPhase = useCallback((phase: FeedPhase) => {
        setFeed(phase);
        if (phase === 'reconnecting') {
            setFeedAttempts((prev) => prev + 1);
        }
        if (phase === 'connected' || phase === 'recovered') {
            setFeedAttempts(0);
        }
    }, []);

    const registerPanel = useCallback((id: string) => {
        setActivatedPanels((prev) => prev.includes(id) ? prev : [...prev, id]);
    }, []);

    const unregisterPanel = useCallback((id: string) => {
        setActivatedPanels((prev) => prev.filter((p) => p !== id));
    }, []);

    return (
        <ConnectionContext.Provider
            value={{ wallet, feed, feedAttempts, activatedPanels, setWalletPhase, setFeedPhase, registerPanel, unregisterPanel }}
        >
            {children}
        </ConnectionContext.Provider>
    );
}
