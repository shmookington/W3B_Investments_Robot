'use client';

import { useSmoothScroll } from '@/hooks/useSmoothScroll';

/**
 * Invisible component that initializes Lenis smooth scroll globally.
 * Drop into any client layout to activate premium scroll physics.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
    useSmoothScroll();
    return <>{children}</>;
}
