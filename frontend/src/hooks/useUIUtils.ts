'use client';

import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';

/* ── Breakpoint Hook ─── */

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const BREAKPOINTS: Record<Breakpoint, number> = {
    xs: 320, sm: 375, md: 768, lg: 1024, xl: 1440, xxl: 1920,
};

export function useBreakpoint(): Breakpoint {
    const [bp, setBp] = useState<Breakpoint>('lg');

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            if (w >= 1920) setBp('xxl');
            else if (w >= 1440) setBp('xl');
            else if (w >= 1024) setBp('lg');
            else if (w >= 768) setBp('md');
            else if (w >= 375) setBp('sm');
            else setBp('xs');
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return bp;
}

export function isMobile(bp: Breakpoint) { return bp === 'xs' || bp === 'sm'; }
export function isTablet(bp: Breakpoint) { return bp === 'md'; }
export function isDesktop(bp: Breakpoint) { return bp === 'lg' || bp === 'xl' || bp === 'xxl'; }

/* ── Scroll Position Memory ─── */

const scrollPositions = new Map<string, number>();

export function useScrollMemory(key: string) {
    useEffect(() => {
        // Restore
        const saved = scrollPositions.get(key);
        if (saved) window.scrollTo({ top: saved, behavior: 'smooth' });

        // Save on unmount
        return () => { scrollPositions.set(key, window.scrollY); };
    }, [key]);
}

/* ── Clipboard with Flash ─── */

export function useCopyToClipboard() {
    const [copied, setCopied] = useState(false);

    const copy = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    return { copy, copied };
}

/* ── Focus Trap ─── */

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
    useEffect(() => {
        if (!active || !ref.current) return;

        const el = ref.current;
        const focusable = el.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        first?.focus();

        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        };

        el.addEventListener('keydown', trap);
        return () => el.removeEventListener('keydown', trap);
    }, [ref, active]);
}

/* ── Konami Code ─── */

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

export function useKonamiCode(callback: () => void) {
    const seq = useRef<string[]>([]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            seq.current.push(e.code);
            if (seq.current.length > KONAMI.length) seq.current.shift();
            if (seq.current.join(',') === KONAMI.join(',')) {
                callback();
                seq.current = [];
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [callback]);
}
