'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Leagues Dashboard ─────────────────────────────────────── */
export default function LeaguesDashboardPage() {
    const [online, setOnline] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=health');
            if (res.ok) { const d = await res.json(); setOnline(d.status === 'ok'); }
        } catch { /* offline */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, []);

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                    LOADING LEAGUE DATA…
                </div>
            </PageContainer>
        );
    }

    const leagues = [
        { icon: '⚽', name: 'SOCCER', leagues: 'Premier League, La Liga, Bundesliga, Serie A, Ligue 1', season: 'Aug – May', markets: 'Match Result, Over/Under, Both Teams to Score' },
        { icon: '🏀', name: 'NBA', leagues: 'National Basketball Association', season: 'Oct – Jun', markets: 'Moneyline, Spread, Total Points, Player Props' },
        { icon: '🏈', name: 'CFB', leagues: 'College Football (FBS)', season: 'Sep – Jan', markets: 'Moneyline, Spread, Total Points, Conference Winner' },
        { icon: '🏈', name: 'NFL', leagues: 'National Football League', season: 'Sep – Feb', markets: 'Moneyline, Spread, Total Points, Player Props, Futures' },
    ];

    return (
        <PageContainer>
            <MonolithNav />

            {/* STATUS */}
            <section style={{ padding: '0 20px', marginBottom: '16px' }}>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        <span style={{ color: online ? '#39ff14' : '#ff4444' }}>
                            ● ENGINE {online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <span style={{ color: 'rgba(224,224,232,0.5)' }}>
                            4 SPORTS · KALSHI EXCHANGE
                        </span>
                    </div>
                </HoloPanel>
            </section>

            {/* LEAGUES OVERVIEW */}
            <section className={styles.futures}>
                <HoloLabel>SUPPORTED LEAGUES</HoloLabel>
                {leagues.map(league => (
                    <HoloPanel key={league.name} size="sm" depth="mid">
                        <div style={{ padding: '20px', fontFamily: '"JetBrains Mono", monospace' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '28px' }}>{league.icon}</span>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#e0e0e8', letterSpacing: '2px' }}>{league.name}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(0,240,255,0.5)' }}>{league.leagues}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '40px', fontSize: '10px', color: 'rgba(224,224,232,0.4)' }}>
                                <div><span style={{ color: 'rgba(0,240,255,0.4)' }}>SEASON:</span> {league.season}</div>
                                <div><span style={{ color: 'rgba(0,240,255,0.4)' }}>MARKETS:</span> {league.markets}</div>
                            </div>
                        </div>
                    </HoloPanel>
                ))}
            </section>

            {/* MODEL STATUS */}
            <section className={styles.inventory}>
                <HoloLabel>MODEL COVERAGE</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(224,224,232,0.6)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Each sport is covered by dedicated prediction models trained on historical data,
                        <br />Elo ratings, advanced features, and real-time injury/weather feeds.
                        <br /><br />
                        <span style={{ color: '#39ff14' }}>All 4 sport models active and generating signals.</span>
                    </div>
                </HoloPanel>
            </section>

            {/* DATA SOURCES */}
            <section className={styles.seasonal}>
                <HoloPanel size="sm" depth="mid" header="DATA SOURCES">
                    <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(224,224,232,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Kalshi Exchange API · ESPN · Sports Reference · The Odds API · Football-Data.org
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
