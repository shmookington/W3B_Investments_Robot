'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HolographicGrid } from '@/components/HolographicGrid';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

interface Stat {
    events: number;
    signals: number;
    active: boolean;
}

interface SportsData {
    nba: Stat;
    soccer: Stat;
    cfb: Stat;
    nfl: Stat;
}

export default function SportsHub() {
    const [data, setData] = useState<SportsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSportsData = async () => {
            try {
                // Fetch schedule totals for today/active
                const [nba, soccer, cfb, nfl] = await Promise.all([
                    fetch('/api/engine/proxy?endpoint=api/data/events/nba').then(r => r.json()),
                    fetch('/api/engine/proxy?endpoint=api/data/events/soccer').then(r => r.json()),
                    fetch('/api/engine/proxy?endpoint=api/data/events/cfb').then(r => r.json()),
                    fetch('/api/engine/proxy?endpoint=api/data/events/nfl').then(r => r.json())
                ]);

                // Fetch signal counts 
                const [nbaSig, soccerSig, cfbSig, nflSig] = await Promise.all([
                    fetch('/api/engine/proxy?endpoint=api/signals/nba').then(r => r.json()),
                    fetch('/api/engine/proxy?endpoint=api/signals/soccer').then(r => r.json()),
                    fetch('/api/engine/proxy?endpoint=api/signals/cfb').then(r => r.json()),
                    fetch('/api/engine/proxy?endpoint=api/signals/nfl').then(r => r.json())
                ]);

                setData({
                    // Only NBA and Soccer are currently active based on project config
                    nba: { events: nba.total || 0, signals: nbaSig.total || 0, active: true },
                    soccer: { events: soccer.total || 0, signals: soccerSig.total || 0, active: true },
                    cfb: { events: cfb.total || 0, signals: cfbSig.total || 0, active: false },
                    nfl: { events: nfl.total || 0, signals: nflSig.total || 0, active: false }
                });
            } catch (err) {
                console.error("Failed to load sports summary", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSportsData();
    }, []);

    const SPORTS = [
        { id: 'nba', name: 'NBA Basketball', emoji: '🏀', path: '/monolith/sports/nba' },
        { id: 'soccer', name: 'Global Soccer', emoji: '⚽', path: '/monolith/sports/soccer' },
        { id: 'cfb', name: 'College Football', emoji: '🏈', path: '/monolith/sports/cfb' },
        { id: 'nfl', name: 'NFL Football', emoji: '🏈', path: '/monolith/sports/nfl' },
    ];

    if (loading) return <div className={styles.loading}>INITIALIZING ORACLE DATALINKS...</div>;

    return (
        <>
            <HolographicGrid />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Sports Oracle Hub</h1>
                    <div className={styles.subtitle}>LIVE PROBABILISTIC MODEL OUTPUTS</div>
                </div>

                <MonolithNav />

                <div style={{ marginBottom: '2rem' }}>
                    <Link href="/monolith/hot" className={styles.card} style={{ display: 'block', borderColor: 'var(--crt-glow)', background: 'rgba(0, 255, 0, 0.05)' }}>
                        <div className={styles.cardHeader}>
                            <div className={styles.sportName} style={{ color: 'var(--crt-glow)', fontSize: '1.5rem' }}>
                                <span className={styles.emoji}>🔥</span>
                                ORACLE HOT BETS
                            </div>
                            <div className={`${styles.status} ${styles.statusActive}`}>
                                LIVE EDGE FEED
                            </div>
                        </div>
                        <div style={{ padding: '1rem', opacity: 0.8 }}>
                            Access the mathematical edge ranking feed for all active games and predictive slates over the next 72 hours.
                        </div>
                    </Link>
                </div>

                <div className={styles.grid}>
                    {SPORTS.map(sport => {
                        const stat = data?.[sport.id as keyof SportsData] || { events: 0, signals: 0, active: false };
                        return (
                            <Link href={sport.path} key={sport.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.sportName}>
                                        <span className={styles.emoji}>{sport.emoji}</span>
                                        {sport.name}
                                    </div>
                                    <div className={`${styles.status} ${stat.active ? styles.statusActive : styles.statusOff}`}>
                                        {stat.active ? 'IN SEASON' : 'OFF SEASON'}
                                    </div>
                                </div>

                                <div className={styles.metrics}>
                                    <div className={styles.metric}>
                                        <span className={styles.metricLabel}>LIVE SLATE</span>
                                        <span className={styles.metricValue}>{stat.events} GAMES</span>
                                    </div>
                                    <div className={styles.metric}>
                                        <span className={styles.metricLabel}>MODEL SIGNALS</span>
                                        <span className={styles.metricValue}>{stat.signals} EDGES</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
