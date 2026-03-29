'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Schedule Dashboard ─────────────────────────────────────── */
export default function ScheduleDashboardPage() {
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
                    LOADING SCHEDULE…
                </div>
            </PageContainer>
        );
    }

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
                            Today&apos;s Event Schedule
                        </span>
                    </div>
                </HoloPanel>
            </section>

            {/* TODAY'S SCHEDULE */}
            <section className={styles.yieldCurve}>
                <HoloLabel>TODAY&apos;S EVENTS</HoloLabel>
                <HoloPanel size="md" depth="mid">
                    <div style={{ padding: '50px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.5 }}>📅</div>
                        AWAITING SCHEDULE FROM ENGINE
                        <br /><br />
                        <span style={{ fontSize: '10px', color: 'rgba(224,224,232,0.25)' }}>
                            Today&apos;s games across Soccer, NBA, CFB, and NFL will populate here
                            <br />once the engine is online and connected to event data feeds.
                            <br />Each event shows: kickoff time, teams, sport, Kalshi market status, and signal availability.
                        </span>
                    </div>
                </HoloPanel>
            </section>

            {/* UPCOMING WEEK */}
            <section className={styles.duration}>
                <HoloLabel>UPCOMING WEEK</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Weekly event calendar with game density heatmap will populate from ESPN and Kalshi event feeds.
                    </div>
                </HoloPanel>
            </section>

            {/* MARKET AVAILABILITY */}
            <section className={styles.credit}>
                <HoloPanel size="md" depth="mid" header="KALSHI MARKET AVAILABILITY">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Shows which events have active Kalshi markets, current liquidity, and order book depth.
                    </div>
                </HoloPanel>
            </section>

            {/* SIGNAL OPPORTUNITIES */}
            <section className={styles.signals}>
                <HoloPanel size="sm" depth="mid" header="SIGNAL OPPORTUNITIES">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Events where our models detect edge above threshold will be highlighted here.
                        <br />Sorted by edge strength, filtered by sport.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
