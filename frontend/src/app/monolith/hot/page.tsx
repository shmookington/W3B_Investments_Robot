'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HolographicGrid } from '@/components/HolographicGrid';
import { LineMovementChart } from '@/components/LineMovementChart';
import { LogPositionModal } from '@/components/LogPositionModal';
import styles from './page.module.css';

interface Signal {
    event_id: string;
    sport: string;
    market_type: string;
    target: string;
    action: string;
    model_probability: number;
    market_probability: number;
    edge_pct: number;
    kelly_fraction: number;
    recommended_stake: number;
    confidence: string;
    kickoff?: string;
    home_team?: string;
    away_team?: string;
    home_score?: number;
    away_score?: number;
    status?: string;
}

export default function HotBetsPage() {
    const [hotSignals, setHotSignals] = useState<Signal[]>([]);
    const [upcomingSignals, setUpcomingSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncTime, setSyncTime] = useState<string>('');
    const [activeLogSignal, setActiveLogSignal] = useState<Signal | null>(null);

    const fetchData = async () => {
        try {
            const [hotRes, upcomingRes] = await Promise.all([
                fetch('/api/engine/proxy?endpoint=api/signals/hot'),
                fetch('/api/engine/proxy?endpoint=api/signals/upcoming')
            ]);
            
            const hotData = await hotRes.json();
            const upcomingData = await upcomingRes.json();
            
            if (hotData && Array.isArray(hotData.signals)) {
                setHotSignals(hotData.signals);
            }
            if (upcomingData && Array.isArray(upcomingData.signals)) {
                setUpcomingSignals(upcomingData.signals);
            }
            
            setSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error("Hot bets sync failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className={styles.loading}>CALCULATING OPTIMAL EDGES...</div>;

    const renderSignalCard = (signal: Signal) => {
        let formattedTime = "LIVE / TBD";
        if (signal.kickoff) {
            const d = new Date(signal.kickoff);
            formattedTime = d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        
        return (
        <div key={signal.event_id + signal.target} className={styles.signalCard}>
            <div className={styles.cardHeader}>
                <div className={styles.sportBadge}>{signal.sport.toUpperCase()}</div>
                <div className={styles.confidenceBadge} data-level={signal.confidence}>
                    {signal.confidence} CONFIDENCE
                </div>
            </div>
            
            <div className={styles.targetSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--crt-glow)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🕒</span> {formattedTime.toUpperCase()}
                    </div>
                    {signal.status && signal.status !== 'STATUS_SCHEDULED' && (
                        <div style={{ fontSize: '0.65rem', border: '1px solid var(--crt-glow)', padding: '2px 6px', color: 'var(--crt-glow)', letterSpacing: '1px' }}>
                            {signal.status === 'STATUS_IN_PROGRESS' ? 'LIVE' : signal.status.replace('STATUS_', '')}
                        </div>
                    )}
                </div>
                
                {signal.home_team && signal.away_team && (
                    <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.4)', borderLeft: '2px solid var(--crt-dim)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: signal.target === signal.away_team ? 'var(--crt-glow)' : '#ccc' }}>{signal.away_team}</span>
                            <span style={{ fontWeight: 'bold' }}>{signal.away_score ?? '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: signal.target === signal.home_team ? 'var(--crt-glow)' : '#ccc' }}>{signal.home_team}</span>
                            <span style={{ fontWeight: 'bold' }}>{signal.home_score ?? '-'}</span>
                        </div>
                    </div>
                )}

                <div className={styles.action}>{signal.action}</div>
                <div className={styles.target}>{signal.target}</div>
                <div className={styles.marketType}>{signal.market_type}</div>
            </div>
            
            <div className={styles.metricsGrid}>
                <div className={styles.metric}>
                    <div className={styles.metricLabel}>MODEL PROB</div>
                    <div className={styles.metricValue}>{(signal.model_probability * 100).toFixed(1)}%</div>
                </div>
                <div className={styles.metric}>
                    <div className={styles.metricLabel}>IMPLIED PROB</div>
                    <div className={styles.metricValue} style={{ opacity: 0.7 }}>{(signal.market_probability * 100).toFixed(1)}%</div>
                </div>
                <div className={styles.metric}>
                    <div className={styles.metricLabel}>EDGE</div>
                    <div className={styles.edgeValue}>+{signal.edge_pct.toFixed(2)}%</div>
                </div>
            </div>
            
            <div className={styles.chartContainer}>
                <div className={styles.chartLabel}>LINE MOVEMENT (24H)</div>
                <LineMovementChart ticker={signal.event_id} height={60} />
            </div>
            
            <div className={styles.footer}>
                <div className={styles.stakeInfo}>
                    REC. STAKE: <span className={styles.stakeValue}>${signal.recommended_stake.toFixed(2)}</span>
                </div>
                <button className={styles.betButton} onClick={() => setActiveLogSignal(signal)}>
                    PLACE BET
                </button>
            </div>
        </div>
        );
    };

    return (
        <>
            <HolographicGrid />
            <div className={styles.container}>
                <Link href="/monolith/sports" className={styles.backBtn}>← SPORTS HUB</Link>
                
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <span style={{ fontSize: '2.5rem' }}>🔥</span> ORACLE HOT BETS
                    </h1>
                    <div className={styles.syncStatus}>
                        <div><span className={styles.liveDot}>●</span>LIVE EDGE TRACKING</div>
                        <div>LAST SYNC: {syncTime}</div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>TODAY'S HIGHEST EDGES</h2>
                    {hotSignals.length === 0 ? (
                        <div className={styles.noSignals}>NO HIGH-EDGE OPPORTUNITIES DETECTED TODAY.</div>
                    ) : (
                        <div className={styles.signalsGrid}>
                            {hotSignals.map(renderSignalCard)}
                        </div>
                    )}
                </div>

                <div className={styles.section} style={{ marginTop: '4rem' }}>
                    <h2 className={styles.sectionTitle}>UPCOMING RADAR (NEXT 72H)</h2>
                    {upcomingSignals.length === 0 ? (
                        <div className={styles.noSignals}>NO UPCOMING VALUE DETECTED YET.</div>
                    ) : (
                        <div className={styles.signalsGrid}>
                            {upcomingSignals.map(renderSignalCard)}
                        </div>
                    )}
                </div>
            </div>
            
            {activeLogSignal && (
                <LogPositionModal 
                    signal={activeLogSignal} 
                    onClose={() => setActiveLogSignal(null)}
                    onSuccess={() => {
                        setActiveLogSignal(null);
                        // Optional: could show a toast or refresh data here
                    }}
                />
            )}
        </>
    );
}
