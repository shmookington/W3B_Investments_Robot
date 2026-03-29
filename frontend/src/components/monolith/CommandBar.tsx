'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CommandBar.module.css';

interface Command {
    id: string;
    label: string;
    description: string;
    action: () => void;
}

/**
 * CommandBar — Cmd+K / slash command palette.
 * Quick actions, page navigation, recent history.
 */
export function CommandBar() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const COMMANDS: Command[] = [
        { id: 'pause-all', label: 'pause all', description: 'Pause all active strategies', action: () => console.log('[CMD] pause all') },
        { id: 'show-risk', label: 'show risk', description: 'Navigate to Risk Engine', action: () => router.push('/monolith/risk') },
        { id: 'run-backtest', label: 'run backtest', description: 'Open Backtesting Lab', action: () => router.push('/monolith/backtest') },
        { id: 'check-feeds', label: 'check feeds', description: 'Open Data Pipeline Health', action: () => router.push('/monolith/data') },
        { id: 'go-overview', label: 'overview', description: 'Go to MONOLITH Overview', action: () => router.push('/monolith') },
        { id: 'go-regime', label: 'regime', description: 'Go to Regime Engine', action: () => router.push('/monolith/regime') },
        { id: 'go-alpha', label: 'alpha', description: 'Go to Alpha Engine', action: () => router.push('/monolith/alpha') },
        { id: 'go-execution', label: 'execution', description: 'Go to Execution Engine', action: () => router.push('/monolith/execution') },
        { id: 'go-portfolio', label: 'portfolio', description: 'Go to Portfolio Construction', action: () => router.push('/monolith/portfolio') },
        { id: 'go-lanes', label: 'lanes', description: 'Go to Lane Splitter', action: () => router.push('/monolith/lanes') },

        { id: 'go-terminal', label: 'terminal', description: 'Open Live Trading Terminal', action: () => router.push('/monolith/terminal') },
        { id: 'go-settings', label: 'settings', description: 'Go to Settings', action: () => router.push('/settings') },
    ];

    const filtered = query
        ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()))
        : COMMANDS;

    // Keyboard shortcut: Cmd+K or /
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey && e.key === 'k') || (e.key === '/' && !(e.target as HTMLElement).closest('input, textarea'))) {
                e.preventDefault();
                setOpen(prev => !prev);
                setQuery('');
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const execute = useCallback((cmd: Command) => {
        cmd.action();
        setHistory(prev => [cmd.label, ...prev.filter(h => h !== cmd.label)].slice(0, 10));
        setOpen(false);
        setQuery('');
    }, []);

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
            <div className={styles.palette} onClick={e => e.stopPropagation()}>
                <div className={styles.inputRow}>
                    <span className={styles.prompt}>&gt;</span>
                    <input
                        ref={inputRef}
                        className={styles.input}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Type a command…"
                        onKeyDown={e => { if (e.key === 'Enter' && filtered.length) execute(filtered[0]); }}
                    />
                    <kbd className={styles.kbd}>ESC</kbd>
                </div>

                <div className={styles.results}>
                    {filtered.map((cmd, i) => (
                        <button key={cmd.id} className={`${styles.result} ${i === 0 ? styles.resultActive : ''}`} onClick={() => execute(cmd)} style={{ animationDelay: `${i * 40}ms` }}>
                            <span className={styles.resultLabel}>{cmd.label}</span>
                            <span className={styles.resultDesc}>{cmd.description}</span>
                        </button>
                    ))}
                </div>

                {history.length > 0 && !query && (
                    <div className={styles.historySection}>
                        <span className={styles.historyLabel}>RECENT</span>
                        {history.map(h => (
                            <span key={h} className={styles.historyItem}>{h}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
