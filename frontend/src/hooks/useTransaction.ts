'use client';

import { useState, useCallback, useRef } from 'react';
import { parseError, type UserError } from '@/lib/errors';

/* ── Transaction Phases ─── */

export type TxPhase = 'idle' | 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface TxState {
    phase: TxPhase;
    hash: string | null;
    error: UserError | null;
}

const INITIAL: TxState = { phase: 'idle', hash: null, error: null };

/**
 * useTransaction — manages 4-phase transaction lifecycle:
 *   pending → submitted → confirmed / failed
 *
 * Provides optimistic update support via onOptimistic / onRevert callbacks.
 */
export function useTransaction() {
    const [state, setState] = useState<TxState>(INITIAL);
    const optimisticRevert = useRef<(() => void) | null>(null);

    const reset = useCallback(() => {
        setState(INITIAL);
        optimisticRevert.current = null;
    }, []);

    /**
     * Execute a transaction with full lifecycle tracking.
     *
     * @param txFn        Async function that returns a tx hash (or object with .hash)
     * @param waitFn      Optional function to wait for confirmation (receives hash)
     * @param onOptimistic Optional callback for optimistic UI (returns revert function)
     */
    const execute = useCallback(async (
        txFn: () => Promise<string | { hash: string }>,
        waitFn?: (hash: string) => Promise<void>,
        onOptimistic?: () => (() => void),
    ) => {
        try {
            // Phase 1: PENDING — waiting for wallet confirmation
            setState({ phase: 'pending', hash: null, error: null });

            // Apply optimistic update
            if (onOptimistic) {
                optimisticRevert.current = onOptimistic();
            }

            // Get tx hash
            const result = await txFn();
            const hash = typeof result === 'string' ? result : result.hash;

            // Phase 2: SUBMITTED — tx sent, waiting for block confirmation
            setState({ phase: 'submitted', hash, error: null });

            // Wait for confirmation if wait function provided
            if (waitFn) {
                await waitFn(hash);
            }

            // Phase 3: CONFIRMED
            setState({ phase: 'confirmed', hash, error: null });
            optimisticRevert.current = null;

        } catch (err) {
            // Phase 4: FAILED — revert optimistic update
            if (optimisticRevert.current) {
                optimisticRevert.current();
                optimisticRevert.current = null;
            }

            const userError = parseError(err);
            setState({ phase: 'failed', hash: state.hash, error: userError });
        }
    }, [state.hash]);

    return { ...state, execute, reset };
}
