'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import styles from './page.module.css';

interface PipelineNode {
    id: string;
    label: string;
    status: 'ONLINE' | 'WARN' | 'OFFLINE';
    subtext: string;
}

interface PendingResolution {
    id: string;
    eventTime: string;
    asset: string;
    consensusSources: string;
    delayReason: string;
}

export default function DataInfrastructurePage() {
    // 1. Ingestion Volume Graph Mock Data (Rolling 24h by GB/hr)
    const [volumeData] = useState([
        { time: '00:00', events: 1.2, stats: 4.1, books: 12.5 },
        { time: '04:00', events: 1.0, stats: 3.8, books: 14.2 },
        { time: '08:00', events: 3.4, stats: 6.2, books: 18.1 },
        { time: '12:00', events: 5.1, stats: 8.5, books: 22.4 },
        { time: '16:00', events: 6.0, stats: 11.0, books: 31.0 },
        { time: '20:00', events: 8.2, stats: 14.5, books: 38.6 },
        { time: '24:00', events: 4.1, stats: 9.1, books: 25.2 },
    ]);

    // 2. Pipeline Flowchart Nodes
    const pipeline: PipelineNode[] = [
        { id: 'ext', label: 'EXTERNAL INGESTION', status: 'WARN', subtext: 'ESPN, Pinnacle, OddsJam' },
        { id: 'redis', label: 'REDIS FIREHOSE', status: 'ONLINE', subtext: 'In-Memory PubSub' },
        { id: 'norm', label: 'NORMALIZATION', status: 'ONLINE', subtext: 'Standardized Vectors' },
        { id: 'pg', label: 'POSTGRES CLUSTER', status: 'ONLINE', subtext: 'Persistent Storage' },
    ];

    // 3. Resolution Queue
    const [pendingEvents] = useState<PendingResolution[]>([
        { id: 'RES-01', eventTime: '2026-03-31T22:30:00Z', asset: 'LAL @ DEN (NBA)', consensusSources: '0/3 Matches', delayReason: 'Disputed Box Score (Rebounds)' },
        { id: 'RES-02', eventTime: '2026-03-31T20:15:00Z', asset: 'NFL Draft Prop (QBs in R1)', consensusSources: 'Waiting for Draft', delayReason: 'Scheduled Future Settlement' },
        { id: 'RES-03', eventTime: '2026-04-01T08:00:00Z', asset: 'ARS -1.5 (EPL)', consensusSources: '1/3 Matches', delayReason: 'Opta Stats API Timeout' },
    ]);

    // Dynamic Flow State Simulation
    const [flowPulse, setFlowPulse] = useState(false);
    useEffect(() => {
        const i = setInterval(() => setFlowPulse(p => !p), 1500);
        return () => clearInterval(i);
    }, []);

    const formatGB = (val: number) => `${val.toFixed(1)} GB`;

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>DATA INFRASTRUCTURE & INGESTION</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. PIPELINE ARCHITECTURE FLOWCHART */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>INGESTION ARCHITECTURE DIAGNOSTICS</h2>
                        <span className={styles.headerTag}>SYSTEM TOPOLOGY</span>
                    </div>

                    <div className={styles.flowchartContainer}>
                        {pipeline.map((node, i) => (
                            <React.Fragment key={node.id}>
                                <div className={`${styles.nodeBox} ${styles[`status${node.status}`]}`}>
                                    <div className={styles.nodeBadge}>[{node.status}]</div>
                                    <div className={styles.nodeLabel}>{node.label}</div>
                                    <div className={styles.nodeSubtext}>{node.subtext}</div>
                                </div>
                                
                                {i < pipeline.length - 1 && (
                                    <div className={styles.connector}>
                                        <div className={`${styles.connectorLine} ${flowPulse ? styles.connectorFlow : ''}`}></div>
                                        <div className={styles.arrow}>▶</div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* 2. INGESTION VOLUME METRICS */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>AGGREGATE INGESTION VOLUME (24H)</h2>
                        <span className={styles.headerTag}>BANDWIDTH TELEMETRY</span>
                    </div>
                    
                    <div className={styles.chartLegend}>
                        <div className={styles.legendItem}><span className={styles.legendColor} style={{background: '#00f0ff'}}></span> Market Lines (Limit Books)</div>
                        <div className={styles.legendItem}><span className={styles.legendColor} style={{background: '#39ff14'}}></span> Player Matrix Stats</div>
                        <div className={styles.legendItem}><span className={styles.legendColor} style={{background: '#ffb800'}}></span> Event Resolutions</div>
                    </div>

                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorStats" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#39ff14" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#39ff14" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ffb800" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#ffb800" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={formatGB} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(5, 5, 8, 0.95)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="books" stackId="1" stroke="#00f0ff" fill="url(#colorBooks)" strokeWidth={2} />
                                <Area type="monotone" dataKey="stats" stackId="1" stroke="#39ff14" fill="url(#colorStats)" strokeWidth={2} />
                                <Area type="monotone" dataKey="events" stackId="1" stroke="#ffb800" fill="url(#colorEvents)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. RESOLUTION ORCHESTRATOR QUEUE */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>RESOLUTION ORCHESTRATOR TRAP</h2>
                        <span className={styles.headerTag}>PENDING MARKET SETTLEMENTS</span>
                    </div>

                    <div className={styles.resolutionWarning}>
                        <strong>{pendingEvents.length} MARKETS TRAPPED:</strong> These events have finished chronologically but lack 3-way consensus from trusted box-score APIs. P&L attribution and model calibration are halted for these vectors until resolution.
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.trapTable}>
                            <thead>
                                <tr>
                                    <th>EVENT VECTOR</th>
                                    <th>CHRONOLOGICAL CLOSE</th>
                                    <th>CONSENSUS STATE</th>
                                    <th>SYSTEMIC DELAY REASON</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingEvents.map(ev => (
                                    <tr key={ev.id}>
                                        <td className={styles.assetCell}>{ev.asset}</td>
                                        <td className={styles.dimCell}>{new Date(ev.eventTime).toLocaleString()}</td>
                                        <td className={styles.consensusCell}>
                                            <span className={styles.consensusWaiting}>[{ev.consensusSources}]</span>
                                        </td>
                                        <td className={styles.reasonCell}>{ev.delayReason}</td>
                                        <td>
                                            <button className={styles.overrideBtn}>[ FORCE RESOLVE ]</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
