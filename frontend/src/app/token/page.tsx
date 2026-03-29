'use client';

import Link from 'next/link';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';

export default function TokenPage() {
    return (
        <PageContainer>
            <section style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                gap: '24px',
            }}>
                <HoloPanel size="md" depth="foreground" glow="cyan">
                    <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                        <HoloLabel>FUND GOVERNANCE</HoloLabel>
                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '2rem',
                            color: 'rgba(224, 224, 232, 0.85)',
                            margin: '16px 0 12px',
                            letterSpacing: '0.05em',
                        }}>Coming Soon</h1>
                        <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: 'rgba(224, 224, 232, 0.4)',
                            maxWidth: 400,
                            margin: '0 auto',
                            lineHeight: 1.8,
                        }}>
                            Fund governance will enable participant voting on fund parameters, fee structure proposals,
                            and operational decisions. Full governance details will be announced prior to launch.
                        </p>
                        <Link href="/" style={{
                            display: 'inline-block',
                            marginTop: '24px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            color: '#0ff',
                            letterSpacing: '0.1em',
                            textDecoration: 'none',
                        }}>
                            ← BACK TO HOME
                        </Link>
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
