'use client';

import { useEffect } from 'react';
import { useCRTStore } from '@/components/CRTOverlay';

/**
 * Tracks mouse position and exposes it as CSS variables via document.documentElement.
 * It's disabled when the user turns off visual effects (accessibility).
 */
export function ParallaxProvider({ children }: { children: React.ReactNode }) {
    const isEnabled = useCRTStore((state) => state.enabled);

    useEffect(() => {
        // If effects are turned off or on mobile, unset variables and remove listener
        if (!isEnabled || window.innerWidth < 768) {
            document.documentElement.style.removeProperty('--mouse-x');
            document.documentElement.style.removeProperty('--mouse-y');
            return;
        }

        let ticking = false;

        const handleMouseMove = (e: MouseEvent) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Normalize viewport to -1 to +1 range (0 is center)
                    const x = (e.clientX / window.innerWidth) * 2 - 1;
                    const y = (e.clientY / window.innerHeight) * 2 - 1;

                    document.documentElement.style.setProperty('--mouse-x', x.toFixed(3));
                    document.documentElement.style.setProperty('--mouse-y', y.toFixed(3));
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isEnabled]);

    // Can just act as a fragment provider
    return <>{children}</>;
}
