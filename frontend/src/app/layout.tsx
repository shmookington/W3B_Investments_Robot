import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/Web3Provider';
import { AuthProvider } from '@/components/AuthProvider';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';
import { GlobalWebGLCanvas } from '@/components/3d/GlobalWebGLCanvas';
import { GlobalNavigation } from '@/components/ui/GlobalNavigation';
import { ConnectionHaltedOverlay } from '@/components/ui/ConnectionHaltedOverlay';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'W3B — Quantitative Prediction Fund',
  description: 'Systematic, transparent, risk-managed quantitative prediction fund.',
  icons: { icon: '/favicon.ico' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'W3B Fund',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-animated" suppressHydrationWarning>
        <AuthProvider>
          <Web3Provider>
            <GlobalWebGLCanvas />
            <ConnectionHaltedOverlay />
            <GlobalNavigation />
            <SmoothScrollProvider>
              <main className="main-layout">
                {children}
              </main>
            </SmoothScrollProvider>
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}
