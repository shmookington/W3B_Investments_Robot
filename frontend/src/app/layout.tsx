import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/components/Web3Provider';
import { CRTOverlay, CRTToggle } from '@/components/CRTOverlay';
import { HolographicGrid } from '@/components/HolographicGrid';
import { ParticleField } from '@/components/ParticleField';
import { ParallaxProvider } from '@/components/ParallaxProvider';
import { AppLayout } from '@/components/Layout';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';
import { BootSequence } from '@/components/BootSequence';
import { CustomCursor } from '@/components/CustomCursor';
import { PageTransition, RouteProgressBar } from '@/components/PageTransition';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'W3B — Quantitative Prediction Fund',
  description:
    'Quantitative prediction fund powered by the MONOLITH engine. Verified returns through CFTC-regulated event contracts.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'W3B — Quantitative Prediction Fund',
    description: 'Systematic, transparent, risk-managed. Verified returns through CFTC-regulated event contracts.',
    siteName: 'W3B Fund',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'W3B — Quantitative Prediction Fund',
    description: 'Systematic, transparent, risk-managed. Verified returns through CFTC-regulated event contracts.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <BootSequence>
            <Web3Provider>
              <ParallaxProvider>
                <HolographicGrid />
                <ParticleField />
                <AppLayout>
                  <SmoothScrollProvider>
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </SmoothScrollProvider>
                </AppLayout>
                <RouteProgressBar />
                <CRTOverlay />
                <CRTToggle />
                <CustomCursor />
              </ParallaxProvider>
            </Web3Provider>
          </BootSequence>
        </AuthProvider>
      </body>
    </html>
  );
}
