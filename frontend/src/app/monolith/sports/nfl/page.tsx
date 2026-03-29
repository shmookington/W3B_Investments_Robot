'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HolographicGrid } from '@/components/HolographicGrid';
import styles from './page.module.css';

interface Game {
    event_id: string;
    home_team: string;
    away_team: string;
    kickoff: string;
    status: string;
    home_score?: number;
    away_score?: number;
    kalshi_market_id?: string;
}

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
}

export default function NFLPage() {
    const [schedule, setSchedule] = useState<Game[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [syncTime, setSyncTime] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [scheduleRes, signalsRes] = await Promise.all([
                fetch('/api/engine/proxy?endpoint=api/data/schedule&sport=nfl'),
                fetch('/api/engine/proxy?endpoint=api/signals/nfl')
            ]);
            
            const scheduleData = await scheduleRes.json();
            const signalsData = await signalsRes.json();
            
            if (scheduleData && Array.isArray(scheduleData.schedule)) {
                setSchedule(scheduleData.schedule);
            }

            if (signalsData && Array.isArray(signalsData.signals)) {
                setSignals(signalsData.signals);
            }
            
            setSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error("NFL dashboard sync failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1m poll
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className={styles.loading}>ESTABLISHING GRIDIRON LINK...</div>;

    return (
        <>
            <HolographicGrid />
            <div className={styles.container}>
                <Link href="/monolith/sports" className={styles.backBtn}>← ALL SPORTS</Link>
                
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <span style={{ fontSize: '2.5rem' }}>🏈</span> NFL HUB
                    </h1>
                    <div className={styles.syncStatus}>
                        <div><span className={styles.liveDot}>●</span>LIVE DATA FEED</div>
                        <div>LAST SYNC: {syncTime}</div>
                    </div>
                </div>

                <div className={styles.metricsBar}>
                    <div className={styles.metricBox}>
                        <div className={styles.metricLabel}>GAMES TODAY</div>
                        <div className={styles.metricValue}>{schedule.length}</div>
                    </div>
                    <div className={styles.metricBox}>
                        <div className={styles.metricLabel}>ACTIVE SIGNALS</div>
                        <div className={styles.metricValue}>{signals.length}</div>
                    </div>
                    <div className={styles.metricBox}>
                        <div className={styles.metricLabel}>MARKET ALIGNMENT</div>
                        <div className={styles.metricValue}>
                            {signals.length > 0 ? (signals.filter(s => s.edge_pct > 0).length / signals.length * 100).toFixed(0) : 0}%
                        </div>
                    </div>
                </div>

                <h2>LIVE SLATE</h2>
                {schedule.length === 0 ? (
                    <div className={styles.noGames}>NO NFL GAMES SCHEDULED FOR TODAY. (OFF-SEASON)</div>
                ) : (
                    <div className={styles.gamesGrid}>
                        {schedule.map((game, i) => {
                            const activeSignal = signals.find(s => s.event_id === game.event_id);
                            
                            return (
                                <div key={i} className={styles.gameCard}>
                                    <div className={styles.gameHeader}>
                                        <div className={styles.matchup}>
                                            {game.away_team} @ {game.home_team}
                                        </div>
                                        <div className={styles.gameTime}>
                                            {game.status === 'live' || game.status === 'IN_PROGRESS' ? (
                                                <span className={styles.liveScore}>
                                                    {game.away_score} - {game.home_score}
                                                </span>
                                            ) : (
                                                game.kickoff ? new Date(game.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'
                                            )}
                                        </div>
                                    </div>
                                    
                                    {activeSignal ? (
                                        <div className={styles.signalBox}>
                                            <div className={styles.signalHeader}>ORACLE EDGE DETECTED</div>
                                            <div className={styles.signalRecommendation}>
                                                TARGET: {activeSignal.target.toUpperCase()} ({activeSignal.market_type})
                                            </div>
                                            <div className={styles.signalDetails}>
                                                <div>MODEL WIN PROB: {(activeSignal.model_probability * 100).toFixed(1)}%</div>
                                                <div>MARKET IMPLIED: {(activeSignal.market_probability * 100).toFixed(1)}%</div>
                                                <div className={activeSignal.edge_pct > 0 ? styles.edgePositive : styles.edgeNegative}>
                                                    EDGE: {activeSignal.edge_pct > 0 ? '+' : ''}{activeSignal.edge_pct.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.signalBox} style={{ opacity: 0.5 }}>
                                            <div className={styles.signalHeader}>NO IDENTIFIABLE EDGE</div>
                                            <div style={{ fontSize: '0.8rem' }}>Algorithm predicts market efficiently priced.</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
