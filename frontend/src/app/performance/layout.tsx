import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Fund Performance — Verified Track Record | W3B',
    description: 'Verified fund performance with risk-adjusted metrics. Sharpe ratio, directional accuracy, equity curve, and monthly returns — fully transparent.',
};

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
