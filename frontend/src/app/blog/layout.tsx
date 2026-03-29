import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Research Blog — W3B Fund',
    description: 'Quantitative research notes, monthly performance updates, and market analysis from the W3B fund team.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
