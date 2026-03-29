/* ─── W3B Identity & KYC Types ─── */

/** Verification provider */
export type VerificationProvider = 'privado' | 'quadrata' | 'none';

/** Verification status */
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'expired';

/** User verification record */
export interface VerificationRecord {
    status: VerificationStatus;
    provider: VerificationProvider;
    /** ISO timestamp when verification was completed */
    verifiedAt: string | null;
    /** ISO timestamp when verification expires */
    expiresAt: string | null;
    /** ZK-proof hash (no personal data stored) */
    proofHash: string | null;
}

/** Privado ID credential request */
export interface PrivadoCredentialRequest {
    id: number;
    circuitId: string;
    query: {
        allowedIssuers: string[];
        type: string;
        context: string;
        credentialSubject: Record<string, unknown>;
    };
}

/** Access levels based on verification */
export type AccessLevel = 'viewer' | 'depositor' | 'full';

/** Maps verification status to access level */
export function getAccessLevel(status: VerificationStatus): AccessLevel {
    switch (status) {
        case 'verified':
            return 'full';
        case 'pending':
            return 'depositor';
        case 'unverified':
        case 'expired':
        default:
            return 'viewer';
    }
}
