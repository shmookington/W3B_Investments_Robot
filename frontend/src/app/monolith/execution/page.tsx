'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import styles from './page.module.css';

interface SlippageEvent {
    id: string;
    asset: string;
    exchange: string;
    target_price: number;
    filled_price: number;
    slippage_bps: number;
    acceptable: boolean;
    timestamp: string;
}

interface ExecutionLog {
    id: string;
    timestamp: string;
    action: string;
    asset: string;
    status: 'PENDING' | 'MATCHED' | 'REJECTED' | 'CANCELLED';
    latency: number;
}

export default function ExecutionMechanicsPage() {
    // 1. API & Fill Rate Metrics
    const fillRate = 97.8;
    const apiLatencyAvg = 42; // ms
    const blockedRequests = 14; 
    const exchangeUptime = 99.9;

    // 2. Slippage Analytics Data
    const [slippageData] = useState<SlippageEvent[]>([
        { id: 'SL-01', asset: 'LAL ML', exchange: 'Kalshi', target_price: 52.0, filled_price: 52.5, slippage_bps: 50, acceptable: true, timestamp: '12:04:11' },
        { id: 'SL-02', asset: 'O224.5 NBA', exchange: 'DraftKings', target_price: 110.0, filled_price: 115.0, slippage_bps: 454, acceptable: false, timestamp: '11:59:45' },
        { id: 'SL-03', asset: 'ARS -1.5', exchange: 'Pinnacle', target_price: 45.0, filled_price: 45.0, slippage_bps: 0, acceptable: true, timestamp: '11:20:00' },
        { id: 'SL-04', asset: 'NYK +4.5', exchange: 'Kalshi', target_price: 33.0, filled_price: 36.0, slippage_bps: 300, acceptable: false, timestamp: '10:15:33' },
    ]);

    // 3. The Execution Queue (Real-Time Simulation)
    const [queue, setQueue] = useState<ExecutionLog[]>([]);
    const queueEndRef = useRef<HTMLDivElement>(null);

    // Simulate hyper-speed execution logs finding matches
    useEffect(() => {
        const assets = ['LAL ML', 'NYK Spread', 'O224.5 points', 'KC Chiefs -3', 'U45.5 Total'];
        const actions = ['LIMIT_ORDER BUY', 'MARKET BUY', 'CANCEL_ORDER', 'AMEND_PRICE'];
        const statuses: ('PENDING' | 'MATCHED' | 'REJECTED' | 'CANCELLED')[] = ['PENDING', 'MATCHED', 'MATCHED', 'MATCHED', 'REJECTED', 'CANCELLED'];
        
        let counter = 0;
        const interval = setInterval(() => {
            const newLog: ExecutionLog = {
                id: `EXEC-X-${Date.now()}-${counter}`,
                timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
                action: actions[Math.floor(Math.random() * actions.length)],
                asset: assets[Math.floor(Math.random() * assets.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                latency: Math.floor(Math.random() * 120) + 15, // 15ms to 135ms
            };

            setQueue(prev => {
                const nextQueue = [newLog, ...prev];
                if (nextQueue.length > 50) return nextQueue.slice(0, 50);
                return nextQueue;
            });
            counter++;
        }, 1200); // New log every 1.2 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>PHYSICAL EXECUTION MECHANICS</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. FILL RATES & API METRICS */}
                <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>GLOBAL FILL RATE</div>
                        <div className={styles.metricValue}>{fillRate}%</div>
                        <div className={styles.metricSubtext}>Target: {'>'} 95.0%</div>
                    </div>
                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>ROUTING LATENCY</div>
                        <div className={styles.metricValue}>{apiLatencyAvg}<span style={{fontSize: '1.2rem', color: 'rgba(255,255,255,0.4)'}}>ms</span></div>
                        <div className={styles.metricSubtext}>Target: {'<'} 50ms</div>
                    </div>
                    <div className={styles.metricCardAlert}>
                        <div className={styles.metricHeader}>REJECTED / RATE LIMITED</div>
                        <div className={styles.metricValueAlert}>{blockedRequests}</div>
                        <div className={styles.metricSubtext}>Suspended or Expired APIs</div>
                    </div>
                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>EXCHANGE UPTIME</div>
                        <div className={styles.metricValue}>{exchangeUptime}%</div>
                        <div className={styles.metricSubtext}>Counterparty status</div>
                    </div>
                </div>

                {/* 2. SLIPPAGE ANALYTICS */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>SLIPPAGE ANALYTICS</h2>
                        <span className={styles.headerTag}>INTENDED VS ACTUAL ENTRY</span>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.slippageTable}>
                            <thead>
                                <tr>
                                    <th>TIME</th>
                                    <th>ASSET VECTOR</th>
                                    <th>EXCHANGE</th>
                                    <th>TARGET ENTRY</th>
                                    <th>FILLED ENTRY</th>
                                    <th>SLIPPAGE DELTA</th>
                                    <th>TOLERANCE STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slippageData.map(trade => (
                                    <tr key={trade.id} className={!trade.acceptable ? styles.rowDanger : ''}>
                                        <td className={styles.dimData}>{trade.timestamp}</td>
                                        <td className={styles.assetData}>{trade.asset}</td>
                                        <td>{trade.exchange}</td>
                                        <td className={styles.priceTarget}>{trade.target_price.toFixed(1)}¢</td>
                                        <td className={styles.priceFilled}>{trade.filled_price.toFixed(1)}¢</td>
                                        <td className={!trade.acceptable ? styles.slippageHigh : styles.slippageLow}>
                                            {trade.slippage_bps > 0 ? '+' : ''}{trade.slippage_bps} bps
                                        </td>
                                        <td>
                                            {trade.acceptable ? (
                                                <span className={styles.badgeOk}>ACCEPTABLE</span>
                                            ) : (
                                                <span className={styles.badgeDanger}>VIOLATION</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. EXECUTION QUEUE (REAL-TIME) */}
                <div className={`${styles.panel} ${styles.queuePanel}`}>
                    <div className={styles.panelHeader}>
                        <h2>FLIGHT TELEMETRY (EXECUTION QUEUE)</h2>
                        <span className={`${styles.headerTag} ${styles.pulseActive}`}>● LIVE FEED</span>
                    </div>

                    <div className={styles.queueContainer}>
                        {queue.length === 0 && <div className={styles.dimData}>AWAITING INITIALIZATION...</div>}
                        
                        {queue.map((log) => (
                            <div key={log.id} className={styles.queueRow}>
                                <div className={styles.queueTime}>[{log.timestamp}]</div>
                                <div className={styles.queueAction}>{log.action}</div>
                                <div className={styles.queueAsset}>{log.asset}</div>
                                <div className={styles.queueLatency}>{log.latency}ms</div>
                                <div className={`${styles.queueStatus} ${styles[`status${log.status}`]}`}>
                                    {log.status === 'MATCHED' ? `[OK - MATCHED]` : `[${log.status}]`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
