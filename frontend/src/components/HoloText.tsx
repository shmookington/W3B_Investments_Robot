'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ─── HoloText Styles (inline for zero-dependency usage) ─── */
const holoStyles = {
    metric: {
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-holo-cyan)',
        textShadow: 'var(--holo-text-shadow)',
        transition: 'all 0.3s ease',
    } as React.CSSProperties,
    header: {
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--weight-semibold)' as string,
        letterSpacing: 'var(--tracking-wider)',
        textTransform: 'uppercase' as const,
        color: 'var(--color-holo-cyan)',
        textShadow: 'var(--holo-text-shadow-sm)',
    } as React.CSSProperties,
    label: {
        fontFamily: 'var(--font-hud)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)' as string,
        letterSpacing: 'var(--tracking-hud)',
        textTransform: 'uppercase' as const,
        color: 'var(--color-text-secondary)',
    } as React.CSSProperties,
};

/* ─── Metric Display (big glowing numbers) ─── */
interface HoloMetricProps {
    value: string | number;
    /** Previous value for change detection */
    prevValue?: string | number;
    prefix?: string;
    suffix?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: 'cyan' | 'green' | 'amber' | 'danger';
}

const sizeMap = { sm: 'var(--text-lg)', md: 'var(--text-2xl)', lg: 'var(--text-3xl)', xl: 'var(--text-4xl)' };
const colorMap = {
    cyan: { color: 'var(--color-holo-cyan)', shadow: 'var(--holo-text-shadow)' },
    green: { color: 'var(--color-accent-green)', shadow: 'var(--phosphor-text-shadow)' },
    amber: { color: 'var(--color-accent-amber)', shadow: 'var(--amber-text-shadow)' },
    danger: { color: 'var(--color-danger)', shadow: 'var(--danger-text-shadow)' },
};

export function HoloMetric({ value, prevValue, prefix, suffix, size = 'md', color = 'cyan' }: HoloMetricProps) {
    const [flare, setFlare] = useState(false);
    const prevRef = useRef(prevValue ?? value);

    useEffect(() => {
        if (String(value) !== String(prevRef.current)) {
            setFlare(true);
            prevRef.current = value;
            const t = setTimeout(() => setFlare(false), 300);
            return () => clearTimeout(t);
        }
    }, [value]);

    const colors = colorMap[color];

    return (
        <span
            style={{
                ...holoStyles.metric,
                fontSize: sizeMap[size],
                color: colors.color,
                textShadow: colors.shadow,
                filter: flare ? 'brightness(1.8)' : 'brightness(1)',
            }}
        >
            {prefix}{value}{suffix}
        </span>
    );
}

/* ─── Header Text (thin, uppercase, cyan glow) ─── */
interface HoloHeaderProps {
    children: ReactNode;
    level?: 'h1' | 'h2' | 'h3' | 'h4';
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function HoloHeader({ children, level = 'h2', size = 'md' }: HoloHeaderProps) {
    const Tag = level;
    return (
        <Tag style={{ ...holoStyles.header, fontSize: sizeMap[size], margin: 0 }}>
            {children}
        </Tag>
    );
}

/* ─── HUD Label ─── */
export function HoloLabel({ children }: { children: ReactNode }) {
    return <span style={holoStyles.label}>{children}</span>;
}

/* ─── Typing Animation ─── */
interface HoloTypingProps {
    text: string;
    speed?: number; // ms per character
    onComplete?: () => void;
}

export function HoloTyping({ text, speed = 40, onComplete }: HoloTypingProps) {
    const [mounted, setMounted] = useState(false);
    const [displayed, setDisplayed] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        setDisplayed('');
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
                onComplete?.();
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed, onComplete, mounted]);

    // Blinking cursor
    useEffect(() => {
        if (!mounted) return;
        const blink = setInterval(() => setCursorVisible((v) => !v), 530);
        return () => clearInterval(blink);
    }, [mounted]);

    // Static placeholder on server / before mount
    if (!mounted) {
        return (
            <span
                style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-accent-green)',
                    textShadow: 'var(--phosphor-text-shadow)',
                    fontSize: 'var(--text-sm)',
                }}
            >
                ▌
            </span>
        );
    }

    return (
        <span
            style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-accent-green)',
                textShadow: 'var(--phosphor-text-shadow)',
                fontSize: 'var(--text-sm)',
            }}
        >
            {displayed}
            <span style={{ opacity: cursorVisible ? 1 : 0, transition: 'opacity 0.1s' }}>▌</span>
        </span>
    );
}

/* ─── Glitch Effect (for critical alerts) ─── */
export function HoloGlitch({ children }: { children: ReactNode }) {
    return (
        <span
            style={{
                position: 'relative',
                display: 'inline-block',
                animation: 'glitch 2s ease-in-out infinite',
                color: 'var(--color-danger)',
                textShadow: 'var(--danger-text-shadow)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 'var(--weight-bold)',
            }}
        >
            {children}
            <style>{`
        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); filter: none; }
          91% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
          92% { transform: translate(2px, -1px); filter: hue-rotate(-90deg); }
          93% { transform: translate(-1px, -1px); filter: none; }
          94% { transform: translate(1px, 1px); filter: hue-rotate(180deg); }
          95% { transform: translate(0); filter: none; }
        }
      `}</style>
        </span>
    );
}
