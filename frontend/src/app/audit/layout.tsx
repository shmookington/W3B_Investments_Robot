import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Track Record — Independently Verified Performance | W3B',
    description: 'Independently verified fund performance history. Monthly returns, cash reserve ratio, and verification sources — fully auditable.',
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
    return children;
}
