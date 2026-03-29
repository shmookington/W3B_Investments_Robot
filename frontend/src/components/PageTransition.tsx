'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useEffect, useState, useCallback } from 'react';
import { springHeavy, springSmooth, tweenSlow } from '@/lib/motion';
import styles from './PageTransition.module.css';

/* ═══════════════════════════════════════════════════
   NAV INDEX — determines transition direction
   ═══════════════════════════════════════════════════ */
const NAV_ORDER = ['/', '/vault', '/bank', '/earn', '/govern', '/monolith'];

function getNavIndex(path: string): number {
    const idx = NAV_ORDER.findIndex((p) => path.startsWith(p) && p !== '/' ? true : path === p);
    return idx >= 0 ? idx : 0;
}

function isMonolithPath(path: string): boolean {
    return path.startsWith('/monolith');
}

/* ═══════════════════════════════════════════════════
   TRANSITION VARIANTS
   ═══════════════════════════════════════════════════ */

/** Bank-style: vertical fade with upward motion */
const bankVariants = {
    initial: { opacity: 0, y: 20, filter: 'blur(0px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springHeavy },
    exit: { opacity: 0, y: -10, filter: 'blur(6px) brightness(0.7)', transition: tweenSlow },
};

/** Monolith: horizontal slide (direction-aware) */
const monolithVariants = (direction: number) => ({
    initial: { opacity: 0, x: 40 * direction },
    animate: { opacity: 1, x: 0, transition: springSmooth },
    exit: { opacity: 0, x: -40 * direction, filter: 'blur(6px) brightness(0.7)', transition: { duration: 0.2 } },
});

/* ═══════════════════════════════════════════════════
   PAGE TRANSITION WRAPPER
   ═══════════════════════════════════════════════════ */

interface PageTransitionProps {
    children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();
    const prevPathRef = useRef(pathname);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const prevIdx = getNavIndex(prevPathRef.current);
        const newIdx = getNavIndex(pathname);
        setDirection(newIdx >= prevIdx ? 1 : -1);
        prevPathRef.current = pathname;
    }, [pathname]);

    const variants = isMonolithPath(pathname)
        ? monolithVariants(direction)
        : bankVariants;

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={styles.page}
                style={{ willChange: 'transform, opacity, filter' }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

/* ═══════════════════════════════════════════════════
   ROUTE PROGRESS BAR
   ═══════════════════════════════════════════════════ */

export function RouteProgressBar() {
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startProgress = useCallback(() => {
        setLoading(true);
        setProgress(0);

        let p = 0;
        timerRef.current = setInterval(() => {
            p += Math.random() * 15 + 5;
            if (p > 90) p = 90;
            setProgress(p);
        }, 100);
    }, []);

    const completeProgress = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setTimeout(() => {
            setLoading(false);
            setProgress(0);
        }, 300);
    }, []);

    // Trigger on pathname change
    useEffect(() => {
        startProgress();
        // Complete after a brief delay (simulates load)
        const done = setTimeout(completeProgress, 200);
        return () => {
            clearTimeout(done);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [pathname, startProgress, completeProgress]);

    if (!loading && progress === 0) return null;

    return (
        <div className={styles.progressBar}>
            <div
                className={styles.progressFill}
                style={{
                    width: `${progress}%`,
                    transition: progress === 100 ? 'width 0.2s ease, opacity 0.3s ease' : 'width 0.3s ease',
                    opacity: progress === 100 ? 0 : 1,
                }}
            />
        </div>
    );
}
