'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { springSmooth } from '@/lib/motion';
import styles from './AnimatedText.module.css';

type AnimatedTextMode = 'typewriter' | 'cascade' | 'glitch-in' | 'decode';

interface AnimatedTextProps {
    text: string;
    mode?: AnimatedTextMode;
    /** Trigger animation (default: true) */
    animate?: boolean;
    /** CSS class for the wrapper */
    className?: string;
    /** Element tag (default: 'span') */
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
    /** Galaxy gradient text effect */
    gradient?: boolean;
}

const GLITCH_CHARS = '!@#$%^&*+=<>?/\\|{}[]~';
const DECODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';

/**
 * AnimatedText — text reveal orchestrator
 *
 * Modes:
 * - typewriter: sequential character reveal (40-80ms randomized)
 * - cascade: staggered fadeUp per character (0.03s)
 * - glitch-in: brief RGB split before resolving
 * - decode: random characters cycle before resolving to actual letter
 */
export function AnimatedText({
    text,
    mode = 'cascade',
    animate = true,
    className = '',
    as: Tag = 'span',
    gradient = false,
}: AnimatedTextProps) {
    const chars = useMemo(() => text.split(''), [text]);

    if (mode === 'typewriter') {
        return (
            <Tag className={`${styles.wrapper} ${gradient ? styles.gradient : ''} ${className}`}>
                <TypewriterText text={text} animate={animate} />
            </Tag>
        );
    }

    if (mode === 'decode') {
        return (
            <Tag className={`${styles.wrapper} ${gradient ? styles.gradient : ''} ${className}`}>
                <DecodeText text={text} animate={animate} />
            </Tag>
        );
    }

    if (mode === 'glitch-in') {
        return (
            <Tag className={`${styles.wrapper} ${gradient ? styles.gradient : ''} ${className}`}>
                {chars.map((char, i) => (
                    <GlitchChar key={i} char={char} delay={i * 0.04} animate={animate} />
                ))}
            </Tag>
        );
    }

    // cascade (default)
    return (
        <Tag className={`${styles.wrapper} ${gradient ? styles.gradient : ''} ${className}`}>
            {chars.map((char, i) => (
                <motion.span
                    key={i}
                    className={styles.char}
                    initial={animate ? { opacity: 0, y: 12 } : false}
                    animate={animate ? { opacity: 1, y: 0 } : false}
                    transition={{ ...springSmooth, delay: i * 0.03 }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </motion.span>
            ))}
        </Tag>
    );
}

/* ─── Typewriter Mode ─── */
function TypewriterText({ text, animate }: { text: string; animate: boolean }) {
    const [displayed, setDisplayed] = useState(animate ? '' : text);

    useEffect(() => {
        if (!animate) { setDisplayed(text); return; }
        let i = 0;
        setDisplayed('');
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 40 + Math.random() * 40);
        return () => clearInterval(interval);
    }, [text, animate]);

    return (
        <>
            {displayed}
            {animate && displayed.length < text.length && (
                <span className={styles.cursor}>▊</span>
            )}
        </>
    );
}

/* ─── Decode Mode ─── */
function DecodeText({ text, animate }: { text: string; animate: boolean }) {
    const [displayed, setDisplayed] = useState(animate ? '' : text);
    const resolvedRef = useRef<boolean[]>(new Array(text.length).fill(!animate));

    useEffect(() => {
        if (!animate) { setDisplayed(text); return; }
        resolvedRef.current = new Array(text.length).fill(false);

        const interval = setInterval(() => {
            // Build display: resolved chars show real text, others show random
            const arr = text.split('').map((char, i) => {
                if (resolvedRef.current[i]) return char;
                if (char === ' ') return ' ';
                return DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
            });
            setDisplayed(arr.join(''));

            // Resolve one more character
            const nextUnresolved = resolvedRef.current.indexOf(false);
            if (nextUnresolved >= 0) {
                resolvedRef.current[nextUnresolved] = true;
            } else {
                clearInterval(interval);
                setDisplayed(text);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [text, animate]);

    return <>{displayed}</>;
}

/* ─── Glitch-In Per Character ─── */
function GlitchChar({ char, delay, animate }: { char: string; delay: number; animate: boolean }) {
    const [phase, setPhase] = useState<'hidden' | 'glitch' | 'resolved'>(animate ? 'hidden' : 'resolved');

    useEffect(() => {
        if (!animate) { setPhase('resolved'); return; }
        const t1 = setTimeout(() => setPhase('glitch'), delay * 1000);
        const t2 = setTimeout(() => setPhase('resolved'), delay * 1000 + 120);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [delay, animate]);

    if (phase === 'hidden') return <span className={styles.charHidden}>{'\u00A0'}</span>;
    if (phase === 'glitch') {
        const glitch = char === ' ' ? '\u00A0' : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        return <span className={styles.glitch}>{glitch}</span>;
    }
    return <span className={styles.char}>{char === ' ' ? '\u00A0' : char}</span>;
}

/* ─── Galaxy Gradient Text (standalone utility) ─── */
export function GalaxyText({
    children,
    className = '',
    as: Tag = 'span',
}: {
    children: React.ReactNode;
    className?: string;
    as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
}) {
    return <Tag className={`${styles.gradient} ${className}`}>{children}</Tag>;
}
