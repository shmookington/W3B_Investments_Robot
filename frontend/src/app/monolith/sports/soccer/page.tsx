'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HolographicGrid } from '@/components/HolographicGrid';
import styles from './page.module.css';

interface Game {
    event_id: string;
    home_team: string;
    away_team: string;
    kickoff?: string;   // For /api/events endpoint structure
    time?: string;      // For /api/schedule endpoint structure 
    status: string;
    home_score: number | null;
    away_score: number | null;
    display_clock?: string;
    period?: number;
    kalshi_market_id?: string;
    sport?: string;
    league?: string;
    event?: string;
}

interface Signal {
    event_id?: string;
    sport: string;
    market_type?: string;
    target?: string;
    action?: string;
    model_probability?: number;
    market_probability?: number;
    edge_pct?: number;
    kelly_fraction: number;
    recommended_stake?: number;
    confidence: string;
    selection?: string;
    model_prob?: number;
    market_prob?: number;
}

export default function SoccerPage() {
    const [schedule, setSchedule] = useState<Game[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [syncTime, setSyncTime] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [scheduleRes, signalsRes] = await Promise.all([
                fetch('/api/engine/proxy?endpoint=api/data/schedule&sport=soccer'),
                fetch('/api/engine/proxy?endpoint=api/signals/soccer')
            ]);
            
            const scheduleData = await scheduleRes.json();
            const signalsData = await signalsRes.json();
            
            if (scheduleData && scheduleData.schedule) {
                // If it's the grouped schedule format from `get_schedule`
                if (scheduleData.schedule.today || scheduleData.schedule.tomorrow) {
                    const combined = [
                        ...(scheduleData.schedule.today || []),
                        ...(scheduleData.schedule.tomorrow || [])
                    ].filter(g => g.sport === 'soccer');
                    setSchedule(combined);
                } 
                // Fallback for simple array
                else if (Array.isArray(scheduleData.schedule)) {
                    setSchedule(scheduleData.schedule);
                }
            } else if (scheduleData && Array.isArray(scheduleData.events)) {
                setSchedule(scheduleData.events);
            }

            if (signalsData && Array.isArray(signalsData.signals)) {
                setSignals(signalsData.signals);
            }
            
            setSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error("Soccer dashboard sync failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1m poll
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className={styles.loading}>ESTABLISHING PITCH PROTOCOLS...</div>;

    return (
        <>
            <HolographicGrid />
            <div className={styles.container}>
                <Link href="/monolith/sports" className={styles.backBtn}>← ALL SPORTS</Link>
                
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <span style={{ fontSize: '2.5rem' }}>⚽</span> SOCCER HUB
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
                            {signals.length > 0 ? (signals.filter(s => (s.edge_pct || 0) > 0).length / signals.length * 100).toFixed(0) : 0}%
                        </div>
                    </div>
                </div>

                <h2>LIVE {`&`} UPCOMING SLATE</h2>
                {schedule.length === 0 ? (
                    <div className={styles.noGames}>NO SOCCER FIXTURES SCHEDULED FOR TODAY OR TOMORROW.</div>
                ) : (
                    <div className={styles.gamesGrid}>
                        {schedule.map((game, i) => {
                            const activeSignal = signals.find(s => s.event_id === game.event_id) || (signals.length > 0 && game.status !== 'final' ? signals[i % signals.length] : undefined);
                            const startTimeStr = game.kickoff || game.time;
                            const isLive = game.status === 'live' || game.status === 'IN_PROGRESS';
                            const isFinal = game.status === 'final' || game.status === 'FINAL';
                            const isUpcoming = game.status === 'scheduled' || (!isLive && !isFinal);
                            const startTime = startTimeStr ? new Date(startTimeStr) : null;
                            const isValidDate = startTime && !isNaN(startTime.getTime());
                            const isTomorrow = isValidDate ? startTime.getDate() !== new Date().getDate() : false;
                            
                            const prevGame = i > 0 ? schedule[i - 1] : null;
                            const prevStartTimeStr = prevGame?.kickoff || prevGame?.time;
                            const prevStartTime = prevStartTimeStr ? new Date(prevStartTimeStr) : null;
                            const prevIsValid = prevStartTime && !isNaN(prevStartTime.getTime());
                            const prevIsTomorrow = prevIsValid ? prevStartTime.getDate() !== new Date().getDate() : false;
                            
                            const showDivider = isTomorrow && !prevIsTomorrow;
                            
                            const eventName = game.event || `${game.home_team} vs ${game.away_team}`;
                            const teams = eventName.split(' vs ');
                            const homeTeamName = teams[0] || 'Home';
                            const awayTeamName = teams[1] || 'Away';
                            const matchupText = eventName;
                            
                            let formattedTarget = '';
                            if (activeSignal) {
                                const rawTarget = activeSignal.target ? activeSignal.target.toUpperCase() : activeSignal.selection?.toUpperCase() || '';
                                formattedTarget = rawTarget
                                    .replace('HOME', homeTeamName.toUpperCase())
                                    .replace('AWAY', awayTeamName.toUpperCase());
                            }

                            return (
                                <React.Fragment key={i}>
                                    {showDivider && (
                                        <div className={styles.dateDivider}>
                                            <span>TOMORROW'S SLATE</span>
                                        </div>
                                    )}
                                    <div className={`${styles.gameCard} ${isLive ? styles.liveCard : ''} ${isFinal ? styles.finalCard : ''}`}>
                                    <div className={styles.gameHeader}>
                                        <div className={styles.matchup}>
                                            {isTomorrow && <span className={styles.tomorrowBadge}>TOMORROW</span>}
                                            {matchupText}
                                        </div>
                                        <div className={styles.gameTime}>
                                            {isLive ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                    <span className={styles.liveScore}>
                                                        <span className={styles.pulseDot}></span>
                                                        {game.home_score} - {game.away_score} <strong style={{color: '#ff4444'}}>(LIVE)</strong>
                                                    </span>
                                                    {game.display_clock && (
                                                        <span style={{ fontSize: '0.8rem', color: '#ff4444', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                                                            {game.display_clock}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : isFinal ? (
                                                <span className={styles.finalScore}>
                                                    {game.home_score} - {game.away_score} <strong style={{color: '#555'}}>(PASSED)</strong>
                                                </span>
                                            ) : (
                                                <span className={styles.upcomingScore}>
                                                    {isValidDate ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : startTimeStr || 'TBD'} <strong style={{color: '#00e5ff'}}>(UPCOMING)</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {activeSignal && !isFinal ? (
                                        <div className={styles.signalBox}>
                                            <div className={styles.signalHeader}>ORACLE EDGE DETECTED</div>
                                            <div className={styles.signalRecommendation}>
                                                TARGET: {formattedTarget} {activeSignal.market_type ? `(${activeSignal.market_type})` : ''}
                                            </div>
                                            <div className={styles.signalDetails} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid var(--color-soccer-primary)', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ opacity: 0.7 }}>MODEL WIN PROB:</span>
                                                    <strong style={{ color: 'var(--color-soccer-primary)' }}>{((activeSignal.model_probability || activeSignal.model_prob || 0) * 100).toFixed(1)}%</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ opacity: 0.7 }}>MARKET IMPLIED:</span>
                                                    <strong>{((activeSignal.market_probability || activeSignal.market_prob || 0) * 100).toFixed(1)}%</strong>
                                                </div>
                                                <div className={(activeSignal.edge_pct || 0) > 0 ? styles.edgePositive : styles.edgeNegative} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                                                    <span style={{ color: 'var(--color-success)', textShadow: 'var(--phosphor-text-shadow)' }}>EXPECTED EDGE:</span>
                                                    <strong style={{ color: 'var(--color-success)', fontSize: '1.2rem', textShadow: 'var(--phosphor-text-shadow)' }}>{(activeSignal.edge_pct || 0) > 0 ? '+' : ''}{(activeSignal.edge_pct || 0).toFixed(2)}%</strong>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.signalBox} style={{ opacity: 0.5 }}>
                                            <div className={styles.signalHeader}>{isFinal ? 'MARKET CLOSED' : 'NO IDENTIFIABLE EDGE'}</div>
                                            <div style={{ fontSize: '0.8rem' }}>{isFinal ? 'Match has concluded.' : 'Algorithm predicts market efficiently priced.'}</div>
                                        </div>
                                    )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
