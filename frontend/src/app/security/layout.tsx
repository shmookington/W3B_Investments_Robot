import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Security — W3B Fund',
    description: 'Security measures, audit reports, circuit breakers, and insurance coverage for the W3B quantitative prediction fund.',
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
    return children;
}
