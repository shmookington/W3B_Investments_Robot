import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Documentation — W3B Fund',
    description: 'Complete documentation for the W3B quantitative prediction fund. How it works, fee structure, glossary, and risk disclosures.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
