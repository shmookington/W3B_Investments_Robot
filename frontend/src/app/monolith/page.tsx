'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';

interface DockerNode {
    id: string;
    alias: string;
    status: 'ok' | 'warn' | 'fail';
    uptime: string;
}

interface LogEntry {
    id: string;
    time: string;
    level: 'INFO' | 'WARN' | 'ERR ' | 'EXEC';
    message: string;
}

export default function OpsOverviewPage() {
    const { user } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Docker Swarm Mock State
    const [nodes, setNodes] = useState<DockerNode[]>([
        { id: 'pos', alias: 'Postgres Core', status: 'ok', uptime: '14d 02h' },
        { id: 'red', alias: 'Redis Async', status: 'ok', uptime: '14d 02h' },
        { id: 'ing', alias: 'Data Ingestion', status: 'ok', uptime: '5d 11h' },
        { id: 'res', alias: 'Odds Resolution', status: 'warn', uptime: '1d 04h' },
        { id: 'kal', alias: 'Kalshi Sync', status: 'ok', uptime: '14d 01h' },
        { id: 'pin', alias: 'Pinnacle Sync', status: 'ok', uptime: '3d 20h' },
        { id: 'dk', alias: 'DK Sync', status: 'ok', uptime: '14d 02h' },
        { id: 'rsk', alias: 'Risk Engine', status: 'ok', uptime: '20d 15h' },
    ]);

    // 2. Latency Mock State
    const [latency, setLatency] = useState<number[]>(Array(40).fill(45));

    // 3. Command Feed State
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: '0', time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: 'INFO', message: 'MONOLITH Operator Dashboard initialized.' },
        { id: '1', time: new Date().toLocaleTimeString('en-US', { hour12: false }), level: 'INFO', message: 'Connected to primary WebSocket multiplexer.' },
    ]);

    // Feed generator
    useEffect(() => {
        const ACTIONS = [
            { level: 'INFO', msg: 'Wrote 142 records to nba_player_props' },
            { level: 'EXEC', msg: 'Sourced $500 capital into LAL/DEN Q3 (HOME_WIN)' },
            { level: 'INFO', msg: 'Ingestion pipeline ping: 42ms' },
            { level: 'WARN', msg: 'Pinnacle API rate limit approaching threshold [85%]' },
            { level: 'EXEC', msg: 'Hedged $1250 exposure via DraftKings moneyline' },
            { level: 'INFO', msg: 'Risk calculations complete: VaR(95) nominal.' },
            { level: 'INFO', msg: 'Recalibrating Kelly fractions against live EV model...' },
            { level: 'EXEC', msg: 'Killed idle capital lane [SOCCER_EPL_DRAW]' },
        ] as const;

        const interval = setInterval(() => {
            const act = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            setLogs(prev => {
                const newLogs = [...prev, {
                    id: Math.random().toString(36).substring(7),
                    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
                    level: act.level,
                    message: act.msg
                }];
                return newLogs.length > 50 ? newLogs.slice(1) : newLogs;
            });
            
            // Randomly blip latency graph
            setLatency(prev => {
                const next = [...prev.slice(1), 35 + Math.random() * 25];
                return next;
            });
            
            // Randomly jitter node status for UI flavor
            if(Math.random() > 0.95) {
               setNodes(prev => prev.map(n => n.id === 'res' ? { ...n, status: Math.random() > 0.5 ? 'warn' : 'ok' } : n));
            }
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll feed
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // 4. Macro State
    const regime = 'MILD CONSOLIDATION';
    const exposure = 25684.50;

    // Build line path for SVG
    const buildPath = (dataArr: number[], w: number, h: number) => {
        const min = 0;
        const max = 100;
        const step = w / (dataArr.length - 1);
        return dataArr.map((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / (max - min)) * h;
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        }).join(' ');
    };

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>OPERATIONAL MASTER CONTROL</HoloLabel>
            </div>
            
            <MonolithNav />

            {/* ─── OPS DASHBOARD ─── */}
            <div className={styles.opsOverview}>
                
                {/* 1. TOP SECTION: System Health Matrix & Latency */}
                <div className={styles.topSection}>
                    {/* Docker Grid */}
                    <HoloPanel size="md" depth="mid" header="DOCKER SWARM HEALTH">
                        <div className={styles.healthGrid}>
                            {nodes.map(node => (
                                <div key={node.id} className={`${styles.healthNode} ${node.status === 'ok' ? styles.healthNodeOk : node.status === 'warn' ? styles.healthNodeWarn : styles.healthNodeFail}`}>
                                    <div className={styles.nodeHeader}>
                                        <span className={styles.nodeName}>{node.alias}</span>
                                        <span className={styles.nodeUptime}>{node.uptime}</span>
                                    </div>
                                    <span className={`${styles.nodeStatus} ${node.status === 'ok' ? styles.statusOk : node.status === 'warn' ? styles.statusWarn : styles.statusFail}`}>
                                        [{node.status.toUpperCase()}]
                                    </span>
                                </div>
                            ))}
                        </div>
                    </HoloPanel>

                    {/* Latency Graph */}
                    <HoloPanel size="md" depth="mid" header="API INGESTION LATENCY (MS)">
                        <div className={styles.latencyPanel}>
                            <svg viewBox="0 0 600 120" className={styles.latencyChart}>
                                <path 
                                    d={`${buildPath(latency, 600, 100)} L600,120 L0,120 Z`}
                                    fill="rgba(0, 240, 255, 0.05)"
                                />
                                <path 
                                    d={buildPath(latency, 600, 100)}
                                    fill="none"
                                    stroke="var(--color-holo-cyan, #00f0ff)"
                                    strokeWidth="1.5"
                                />
                                {/* Threshold line */}
                                <line x1="0" y1="20" x2="600" y2="20" stroke="rgba(255,184,0,0.4)" strokeWidth="1" strokeDasharray="4 4" />
                            </svg>
                            <div className={styles.latencyLegend}>
                                <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#00f0ff' }} /> INGEST STREAM</span>
                                <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ffb800' }} /> CRITICAL THRESHOLD (80ms)</span>
                            </div>
                        </div>
                    </HoloPanel>
                </div>

                {/* 2. MIDDLE SECTION: Macro State */}
                <div className={styles.middleSection}>
                    <HoloPanel size="sm" depth="foreground" header="ACTIVE REGIME DETECTION">
                        <div className={styles.macroPanel}>
                            <div className={styles.macroLabel}>QUANTITATIVE REGIME</div>
                            {/* Color mapping logic simplified for demo */}
                            <div className={`${styles.macroRegime} ${styles.macroRegimeRange}`}>
                                {regime}
                            </div>
                            <div className={styles.macroLabel} style={{ marginTop: '16px' }}>ALGORITHMIC SIZING CAP</div>
                            <div style={{ fontFamily: 'monospace', color: 'rgba(244,244,245,0.7)' }}>DEFAULT (KELLY / 2.0)</div>
                        </div>
                    </HoloPanel>

                    <HoloPanel size="sm" depth="foreground" header="CAPITAL EXPOSURE">
                        <div className={styles.macroPanel} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                            <div className={styles.macroLabel}>TOTAL ACTIVE EXPOSURE (USD)</div>
                            <div className={styles.exposureValue}>
                                ${exposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={styles.macroLabel} style={{ marginTop: '16px' }}>PORTFOLIO LEVERAGE</div>
                            <div style={{ fontFamily: 'monospace', color: 'var(--color-phosphor, #39ff14)' }}>1.02x (NOMINAL)</div>
                        </div>
                    </HoloPanel>
                </div>

                {/* 3. BOTTOM SECTION: Command Feed */}
                <div className={styles.bottomSection}>
                     <HoloPanel size="lg" depth="background" header="RAW COMMAND STREAM (STDOUT)">
                        <div className={styles.terminalContainer} ref={scrollRef}>
                            {logs.map(log => (
                                <div key={log.id} className={styles.terminalLine}>
                                    <span className={styles.logTime}>[{log.time}]</span>
                                    <span className={
                                        log.level === 'INFO' ? styles.logLevelInfo :
                                        log.level === 'WARN' ? styles.logLevelWarn :
                                        log.level === 'ERR ' ? styles.logLevelErr :
                                        styles.logLevelExec
                                    }>[{log.level}]</span>
                                    <span className={styles.logMessage}>{log.message}</span>
                                </div>
                            ))}
                            <div className={styles.terminalLine}>
                                <span className={styles.logTime}>[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}]</span>
                                <span className={styles.logLevelInfo} style={{ borderBottom: '1px solid currentColor' }}>AWAITING SIGNAL</span><span className={styles.pulseCursor} />
                            </div>
                        </div>
                     </HoloPanel>
                </div>

            </div>
        </PageContainer>
    );
}
