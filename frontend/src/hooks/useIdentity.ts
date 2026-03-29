'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    VerificationRecord,
    VerificationStatus,
    VerificationProvider,
    AccessLevel,
} from '@/types/identity';
import { getAccessLevel } from '@/types/identity';

/* ─── Verification State Store ─── */
interface VerificationState {
    /** Current verification record */
    verification: VerificationRecord;
    /** Derived access level */
    accessLevel: AccessLevel;
    /** Whether verification flow modal is open */
    isVerifying: boolean;
    /** Set the verification record */
    setVerification: (record: Partial<VerificationRecord>) => void;
    /** Start verification flow */
    startVerification: () => void;
    /** Cancel verification flow */
    cancelVerification: () => void;
    /** Complete verification */
    completeVerification: (provider: VerificationProvider, proofHash: string) => void;
    /** Reset to unverified */
    resetVerification: () => void;
}

const DEFAULT_VERIFICATION: VerificationRecord = {
    status: 'unverified',
    provider: 'none',
    verifiedAt: null,
    expiresAt: null,
    proofHash: null,
};

export const useVerificationStore = create<VerificationState>()(
    persist(
        (set) => ({
            verification: DEFAULT_VERIFICATION,
            accessLevel: 'viewer',
            isVerifying: false,

            setVerification: (record) =>
                set((state) => {
                    const updated = { ...state.verification, ...record };
                    return {
                        verification: updated,
                        accessLevel: getAccessLevel(updated.status),
                    };
                }),

            startVerification: () => set({ isVerifying: true }),

            cancelVerification: () => set({ isVerifying: false }),

            completeVerification: (provider, proofHash) =>
                set({
                    verification: {
                        status: 'verified',
                        provider,
                        verifiedAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                        proofHash,
                    },
                    accessLevel: 'full',
                    isVerifying: false,
                }),

            resetVerification: () =>
                set({
                    verification: DEFAULT_VERIFICATION,
                    accessLevel: 'viewer',
                    isVerifying: false,
                }),
        }),
        { name: 'w3b-verification' }
    )
);

/* ─── Privado ID Integration Hook ─── */
export function usePrivadoVerification() {
    const { startVerification, completeVerification, cancelVerification, verification } =
        useVerificationStore();

    /**
     * Initiates the Privado ID ZK-proof verification flow.
     * In production, this calls the Privado SDK to generate a ZK-proof
     * proving the user has a valid KYC credential without revealing personal data.
     */
    const verifyWithPrivado = async () => {
        startVerification();

        try {
            // Privado ID ZK-Proof flow:
            // 1. Request credential from Privado (user scans QR or connects wallet)
            // 2. Privado generates ZK-proof locally on user's device
            // 3. Proof is submitted to our verification contract on-chain
            // 4. Contract emits VerifiedHuman(address) event
            // 5. Frontend reads the event and updates state
            //
            // For now, simulate the flow structure.
            // In production, replace with actual Privado SDK calls:
            //   import { PrivadoId } from '@privado-id/sdk';
            //   const proof = await PrivadoId.prove(credentialRequest);
            //   await verificationContract.verify(proof);

            const mockProofHash = `0x${Array.from({ length: 64 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('')}`;

            // In production: await the on-chain verification transaction
            completeVerification('privado', mockProofHash);
        } catch {
            cancelVerification();
        }
    };

    return {
        verifyWithPrivado,
        isVerifying: verification.status === 'pending',
        isVerified: verification.status === 'verified',
        verification,
    };
}

/* ─── Quadrata Fallback Hook ─── */
export function useQuadrataVerification() {
    const { startVerification, completeVerification, cancelVerification, verification } =
        useVerificationStore();

    /**
     * Initiates the Quadrata verification flow as a fallback.
     * Quadrata provides passport-based identity attestation.
     */
    const verifyWithQuadrata = async () => {
        startVerification();

        try {
            // Quadrata flow:
            // 1. User connects to Quadrata's identity dApp
            // 2. Quadrata issues on-chain attestation (QuadPassport NFT)
            // 3. Our contract checks for the attestation
            //
            // In production, replace with actual Quadrata SDK:
            //   import { QuadClient } from '@quadrata/client-react';

            const mockProofHash = `0x${Array.from({ length: 64 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('')}`;

            completeVerification('quadrata', mockProofHash);
        } catch {
            cancelVerification();
        }
    };

    return {
        verifyWithQuadrata,
        isVerifying: verification.status === 'pending',
        isVerified: verification.status === 'verified',
        verification,
    };
}

/* ─── Access Gate Hook ─── */
/**
 * Use this hook to gate features based on verification status.
 * Unverified users can VIEW but cannot interact with lending/borrowing.
 */
export function useAccessGate() {
    const { accessLevel, verification } = useVerificationStore();

    return {
        /** Can view all pages */
        canView: true,
        /** Can deposit into vault (any status) */
        canDeposit: accessLevel === 'depositor' || accessLevel === 'full',
        /** Can use lending/borrowing/synthetics (verified only) */
        canInteract: accessLevel === 'full',
        /** Current access level */
        accessLevel,
        /** Current verification status */
        status: verification.status,
        /** Provider used for verification */
        provider: verification.provider,
        /** Whether verification has expired */
        isExpired:
            verification.expiresAt !== null && new Date(verification.expiresAt) < new Date(),
    };
}
