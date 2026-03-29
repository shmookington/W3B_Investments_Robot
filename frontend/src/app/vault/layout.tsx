import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Fund Vault — Invest & Earn | W3B',
    description: 'Invest in the W3B prediction fund and earn returns from our quantitative probability models. 0% deposit fee, 0% management fee, 20% performance fee above high-water mark.',
};

export default function VaultLayout({ children }: { children: React.ReactNode }) {
    return children;
}
