'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HolographicGrid } from '@/components/HolographicGrid';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

interface Game {
    event_id: string;
    home_team?: string;
    away_team?: string;
    kickoff?: string;
    time?: string;
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
    event_title?: string;
    market_title?: string;
    side?: string;
    sport: string;
    market_type?: string;
    target?: string;
    action?: string;
    model_probability?: number;
    market_probability?: number;
    market_price_cents?: number;
    edge?: number;
    edge_pct?: number;
    kelly_fraction: number;
    position_size_dollars?: number;
    confidence: string;
    selection?: string;
    model_prob?: number;
    market_prob?: number;
}

// ── Elo-derived mock data (fallback when backend is unreachable) ──
// Win probabilities computed from the NBAEloModel ratings with 50-pt HFA
const MOCK_NBA_SCHEDULE: (Game & { _hoursFromNow: number })[] = [
    { event_id: 'EVT-nba-001', sport: 'nba', league: 'NBA', event: 'Boston Celtics vs Los Angeles Lakers', home_team: 'Los Angeles Lakers', away_team: 'Boston Celtics', status: 'scheduled', home_score: null, away_score: null, _hoursFromNow: 6 },
    { event_id: 'EVT-nba-002', sport: 'nba', league: 'NBA', event: 'Philadelphia 76ers vs Milwaukee Bucks', home_team: 'Milwaukee Bucks', away_team: 'Philadelphia 76ers', status: 'scheduled', home_score: null, away_score: null, _hoursFromNow: 7 },
    { event_id: 'EVT-nba-003', sport: 'nba', league: 'NBA', event: 'Phoenix Suns vs Golden State Warriors', home_team: 'Golden State Warriors', away_team: 'Phoenix Suns', status: 'scheduled', home_score: null, away_score: null, _hoursFromNow: 8 },
];

const MOCK_NBA_SIGNALS: Signal[] = [
    {
        event_id: 'EVT-nba-001', event_title: 'Boston Celtics vs Los Angeles Lakers',
        market_title: 'Will Boston Celtics Win?', side: 'yes', sport: 'nba',
        model_probability: 0.6156, market_probability: 0.4344, market_price_cents: 43.4,
        edge: 0.1812, edge_pct: 18.12, confidence: 'HIGH', kelly_fraction: 0.0453,
        selection: 'Boston Celtics ML',
    },
    {
        event_id: 'EVT-nba-002', event_title: 'Philadelphia 76ers vs Milwaukee Bucks',
        market_title: 'Will Milwaukee Bucks Win?', side: 'yes', sport: 'nba',
        model_probability: 0.5715, market_probability: 0.4785, market_price_cents: 47.9,
        edge: 0.0930, edge_pct: 9.30, confidence: 'HIGH', kelly_fraction: 0.0233,
        selection: 'Milwaukee Bucks ML',
    },
    {
        event_id: 'EVT-nba-003', event_title: 'Phoenix Suns vs Golden State Warriors',
        market_title: 'Will Phoenix Suns Win?', side: 'yes', sport: 'nba',
        model_probability: 0.5578, market_probability: 0.4922, market_price_cents: 49.2,
        edge: 0.0656, edge_pct: 6.56, confidence: 'MEDIUM', kelly_fraction: 0.0164,
        selection: 'Phoenix Suns ML',
    },
];

export default function NBAPage() {
    const [schedule, setSchedule] = useState<Game[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [syncTime, setSyncTime] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [scheduleRes, signalsRes] = await Promise.all([
                fetch('/api/engine/proxy?endpoint=api/data/schedule&sport=nba'),
                fetch('/api/engine/proxy?endpoint=api/signals/nba')
            ]);
            
            const scheduleData = await scheduleRes.json();
            const signalsData = await signalsRes.json();
            
            // Only update schedule if we got valid data
            if (scheduleData && scheduleData.schedule) {
                if (scheduleData.schedule.today || scheduleData.schedule.tomorrow) {
                    const combined = [
                        ...(scheduleData.schedule.today || []),
                        ...(scheduleData.schedule.tomorrow || [])
                    ].filter(g => g.sport === 'nba');
                    if (combined.length > 0) {
                        setSchedule(combined);
                    }
                } else if (Array.isArray(scheduleData.schedule) && scheduleData.schedule.length > 0) {
                    setSchedule(scheduleData.schedule);
                }
            } else if (scheduleData && Array.isArray(scheduleData.events) && scheduleData.events.length > 0) {
                setSchedule(scheduleData.events);
            }

            // Only update signals if we got valid data — never wipe existing signals
            if (signalsData && Array.isArray(signalsData.signals) && signalsData.signals.length > 0) {
                setSignals(signalsData.signals);
            }
            
            setSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error("NBA dashboard sync failed:", e);
            // On error, keep whatever data we already have — don't wipe it
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1m poll
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className={styles.loading}>ESTABLISHING COURT PROTOCOLS...</div>;

    return (
        <>
            <HolographicGrid />
            <div className={styles.container}>
                <Link href="/monolith/sports" className={styles.backBtn}>← ALL SPORTS</Link>
                
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <span style={{ fontSize: '2.5rem' }}>🏀</span> NBA HUB
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

                <h2>LIVE SLATE</h2>
                {schedule.length === 0 ? (
                    <div className={styles.noGames}>NO NBA GAMES SCHEDULED FOR TODAY.</div>
                ) : (
                    <div className={styles.gamesGrid}>
                        {schedule.map((game, i) => {
                            const eventName = game.event || `${game.away_team} vs ${game.home_team}`;
                            
                            // Multi-layer signal matching: event_id → event_title → team names
                            const activeSignal = signals.find(s => {
                                // 1. Direct event_id match (most reliable)
                                if (s.event_id && game.event_id && s.event_id === game.event_id) return true;
                                // 2. Exact event_title match
                                if (s.event_title && s.event_title === eventName) return true;
                                // 3. Fuzzy team-name match: check if signal title contains both team names
                                if (s.event_title && game.home_team && game.away_team) {
                                    const sigTitle = s.event_title.toLowerCase();
                                    const homeShort = game.home_team.split(' ').pop()?.toLowerCase() || '';
                                    const awayShort = game.away_team.split(' ').pop()?.toLowerCase() || '';
                                    if (homeShort && awayShort && sigTitle.includes(homeShort) && sigTitle.includes(awayShort)) return true;
                                }
                                return false;
                            });
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
                            
                            const teams = eventName.split(' vs ');
                            const awayTeamName = teams[0] || 'Away';
                            const homeTeamName = teams[1] || 'Home';
                            const matchupText = `${awayTeamName} @ ${homeTeamName}`;
                            
                            // Build the projected winner display from the signal
                            let formattedTarget = '';
                            if (activeSignal) {
                                if (activeSignal.market_title && activeSignal.market_title.includes('Win?')) {
                                    // Best path: use the market_title directly → "Will Lakers Win?" → "BUY LAKERS ML"
                                    const winnerName = activeSignal.market_title.replace('Will ', '').replace(' Win?', '');
                                    formattedTarget = `BUY ${winnerName.toUpperCase()} ML`;
                                } else if (activeSignal.model_probability && activeSignal.model_probability > 0.50) {
                                    // Fallback: determine by probability
                                    formattedTarget = `BUY ${homeTeamName.toUpperCase()} ML`;
                                } else {
                                    formattedTarget = `BUY ${awayTeamName.toUpperCase()} ML`;
                                }
                            }

                            const endedRecently = isFinal && isValidDate && startTime
                                ? (Date.now() - startTime.getTime()) < 2 * 60 * 60 * 1000
                                : false;
                            if (isFinal && !activeSignal && !endedRecently) {
                                return null;
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
                                                        {game.away_score} - {game.home_score} <strong style={{color: '#ff4444'}}>(LIVE)</strong>
                                                    </span>
                                                    {game.display_clock && (
                                                        <span style={{ fontSize: '0.8rem', color: '#ff4444', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                                                            {game.period ? `Q${game.period} | ` : ''}{game.display_clock}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : isFinal ? (
                                                <span className={styles.finalScore}>
                                                    {game.away_score} - {game.home_score} <strong style={{color: '#555'}}>(PASSED)</strong>
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
                                                TARGET: {formattedTarget || 'ANALYZING...'} {activeSignal.market_type ? `(${activeSignal.market_type})` : ''}
                                            </div>
                                            <div className={styles.signalDetails} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid var(--color-nba-secondary)', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ opacity: 0.7 }}>MODEL WIN PROB:</span>
                                                    <strong style={{ color: 'var(--color-nba-secondary)' }}>{((activeSignal.model_probability || activeSignal.model_prob || 0) * 100).toFixed(1)}%</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ opacity: 0.7 }}>MARKET PRICE:</span>
                                                    <strong>{activeSignal.market_price_cents ? `${activeSignal.market_price_cents}¢ (${(activeSignal.market_price_cents).toFixed(1)}%)` : `${((activeSignal.market_probability || activeSignal.market_prob || 0) * 100).toFixed(1)}%`}</strong>
                                                </div>
                                                <div className={(activeSignal.edge || activeSignal.edge_pct || 0) > 0 ? styles.edgePositive : styles.edgeNegative} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                                                    <span style={{ color: 'var(--color-success)', textShadow: 'var(--phosphor-text-shadow)' }}>EXPECTED EDGE:</span>
                                                    <strong style={{ color: 'var(--color-success)', fontSize: '1.2rem', textShadow: 'var(--phosphor-text-shadow)' }}>{(activeSignal.edge || activeSignal.edge_pct || 0) > 0 ? '+' : ''}{(activeSignal.edge ? activeSignal.edge * 100 : activeSignal.edge_pct || 0).toFixed(2)}%</strong>
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
