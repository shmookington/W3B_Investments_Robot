'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import styles from './page.module.css';

interface LogEntry {
    id: string;
    time: string;
    level: string;
    message: string;
    isCommand?: boolean;
}

export default function TerminalPage() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [input, setInput] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: 'boot1', time: getTime(), level: 'SYS', message: 'MONOLITH Engine Interactive Terminal v2.1.4' },
        { id: 'boot2', time: getTime(), level: 'SYS', message: 'Establishing secure WebSocket channel to Hetzner VPS...' },
        { id: 'boot3', time: getTime(), level: 'OK ', message: 'Channel [STDOUT_STREAM] established. Latency: 12ms.' },
        { id: 'boot4', time: getTime(), level: 'SYS', message: 'Type /help for command list.' },
    ]);

    function getTime() {
        return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    }

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Focus input on any click in the terminal area
    const handleTerminalClick = () => {
        inputRef.current?.focus();
    };

    const handleCommandSubmit = (e: FormEvent) => {
        e.preventDefault();
        const cmd = input.trim();
        if (!cmd) return;

        // Echo the command
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            time: getTime(),
            level: 'CMD',
            message: `> ${cmd}`,
            isCommand: true
        }]);

        setInput('');

        // Mock command processing
        setTimeout(() => {
            let responseLevels = ['INFO'];
            let responseMessages = [''];

            if (cmd === '/help') {
                responseMessages = [
                    'AVAILABLE COMMANDS:',
                    '  /force-resolve    [id] Bypass async resolution and force payout',
                    '  /suspend-execution     HALT ALL EXECUTIONS (KILL SWITCH)',
                    '  /sync-kalshi           Manually trigger Kalshi API sync payload',
                    '  /flush-redis           Clear uncommitted state from Redis layer',
                    '  /engine-status         Print diagnostic tree of quant engine'
                ];
            } else if (cmd.startsWith('/force-resolve')) {
                const parts = cmd.split(' ');
                const eventId = parts[1] || '<missing_id>';
                responseLevels = ['EXEC', 'OK '];
                responseMessages = [
                    `Initiating forced resolution protocol for Event: ${eventId}...`,
                    `Event ${eventId} resolved successfully. Wrote to DB.`
                ];
            } else if (cmd === '/suspend-execution') {
                responseLevels = ['ERR ', 'ERR '];
                responseMessages = [
                    'BROADCASTING GLOBAL HALT SIGNAL...',
                    'ALL EXECUTIONS SUSPENDED. REQUIRES MANUAL UNLOCK.'
                ];
            } else if (cmd === '/sync-kalshi') {
                responseLevels = ['INFO', 'INFO', 'OK '];
                responseMessages = [
                    'Dispatching HTTP GET to API.kalshi.com/v2/markets...',
                    'Received 4021 market payloads. Parsing...',
                    'Sync complete in 421ms.'
                ];
            } else if (cmd === '/flush-redis') {
                responseLevels = ['WARN', 'OK '];
                responseMessages = [
                    'Flushing uncommitted state from volatile memory...',
                    'Redis queue cleared: 0 bytes remain.'
                ];
            } else if (cmd === '/engine-status') {
                responseLevels = ['INFO', 'INFO', 'INFO'];
                responseMessages = [
                    'Status: NOMINAL',
                    'Exposure limit: 85%',
                    'Data latency: 24ms (Acceptable)'
                ];
            } else {
                responseLevels = ['ERR '];
                responseMessages = [`ERROR: Unrecognized command '${cmd}'.`];
            }

            // Append responses
            responseMessages.forEach((msg, idx) => {
                setTimeout(() => {
                    setLogs(prev => [...prev, {
                        id: Math.random().toString(36).substring(7),
                        time: getTime(),
                        level: responseLevels[idx] || 'INFO',
                        message: msg
                    }]);
                }, idx * 300);
            });

        }, 150);
    };

    // Simulated WebSocket background stdout
    useEffect(() => {
        const bgLogs = [
            'System tick: evaluating delta hedging parameters...',
            'Heartbeat: postgres (OK) redis (OK) engine (OK)',
            'Cleaning up orphaned threads (0 found)',
            'No arbitrage opportunities identified in current sweep (1.2s)',
            'Risk Engine evaluating VaR threshold across 12 live positions...'
        ];

        const interval = setInterval(() => {
            if (Math.random() > 0.8) {
                const msg = bgLogs[Math.floor(Math.random() * bgLogs.length)];
                setLogs(prev => {
                    const newLogs = [...prev, {
                        id: Math.random().toString(36).substring(7),
                        time: getTime(),
                        level: 'DBG',
                        message: msg
                    }];
                    return newLogs.length > 300 ? newLogs.slice(newLogs.length - 300) : newLogs;
                });
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>VPS / TERMINAL OVERRIDE</HoloLabel>
            </div>
            
            <MonolithNav />

            {/* Terminal Interface */}
            <div className={styles.terminalContainer}>
                <div className={styles.terminalWrapper} onClick={handleTerminalClick}>
                    <div className={styles.terminalInner} ref={scrollRef}>
                        {logs.map(log => (
                            <div key={log.id} className={`${styles.logLine} ${log.isCommand ? styles.logCommand : ''}`}>
                                <span className={styles.timeFilter}>[{log.time}]</span>
                                <span className={
                                    log.level === 'SYS' ? styles.lvlSys :
                                    log.level === 'OK ' ? styles.lvlOk :
                                    log.level === 'ERR ' ? styles.lvlErr :
                                    log.level === 'WARN' ? styles.lvlWarn :
                                    log.level === 'EXEC' ? styles.lvlExec :
                                    log.level === 'CMD' ? styles.lvlCmd :
                                    styles.lvlDbg
                                }>
                                    [{log.level}]
                                </span>
                                <span className={styles.msgFilter}>{log.message}</span>
                            </div>
                        ))}
                        
                        <div className={styles.inputLine}>
                            <span className={styles.prompt}>root@monolith:~#</span>
                            <form onSubmit={handleCommandSubmit} className={styles.inputForm}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className={styles.commandInput}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    autoFocus
                                    spellCheck={false}
                                    autoComplete="off"
                                />
                                <span className={styles.blinkingCursor}>&nbsp;</span>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
