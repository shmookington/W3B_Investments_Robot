'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Component ─────────────────────────────────────────────── */
export default function DataPipelinePage() {
    const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=health');
            if (res.ok) setHealth(await res.json());
        } catch { /* offline */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                    LOADING DATA PIPELINE STATUS…
                </div>
            </PageContainer>
        );
    }

    const online = health?.status === 'ok';

    return (
        <PageContainer>
            <MonolithNav />

            {/* 1. ENGINE HEALTH */}
            <section className={styles.feeds}>
                <HoloLabel>DATA PIPELINE — ENGINE STATUS</HoloLabel>
                <div className={styles.feedGrid}>
                    <HoloPanel size="sm" depth="foreground">
                        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: online ? '#39ff14' : '#ff4444', boxShadow: online ? '0 0 8px #39ff14' : '0 0 8px #ff4444' }} />
                            <span style={{ color: online ? '#39ff14' : '#ff4444' }}>
                                ENGINE {online ? 'ONLINE' : 'OFFLINE'}
                            </span>
                            {health?.timestamp && (
                                <span style={{ color: 'rgba(224,224,232,0.2)', fontSize: '10px', marginLeft: 'auto' }}>
                                    Last heartbeat: {new Date(health.timestamp).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </HoloPanel>
                </div>
            </section>

            {/* 2. FEED STATUS — AWAITING */}
            <section className={styles.feeds}>
                <HoloLabel>FEED STATUS BOARD</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Individual data feed statuses (Kalshi, ESPN, Sports Reference, Odds API, etc.)
                        <br />will be exposed once the engine provides per-feed health check endpoints.
                        <br /><br />
                        Engine health is currently: <span style={{ color: online ? '#39ff14' : '#ff4444' }}>{online ? 'OK' : 'OFFLINE'}</span>
                    </div>
                </HoloPanel>
            </section>

            {/* 3. VALIDATION PIPELINE — AWAITING */}
            <section className={styles.validation}>
                <HoloLabel>4-LAYER VALIDATION PIPELINE</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Data validation pipeline stats (Schema → Bounds → Cross-Source → Staleness)
                        <br />will populate once the engine exposes data quality metrics.
                    </div>
                </HoloPanel>
            </section>

            {/* 4. GAP DETECTION — AWAITING */}
            <section className={styles.gaps}>
                <HoloPanel size="sm" depth="mid" header="GAP DETECTION LOG">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Gap detection and fill events will be logged here as the data pipeline
                        <br />encounters and resolves missing data points in real-time.
                    </div>
                </HoloPanel>
            </section>

            {/* 5. FAILOVER STATUS — AWAITING */}
            <section className={styles.failover}>
                <HoloLabel>FAILOVER STATUS</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Failover configuration and events will be displayed once
                        the engine exposes data source redundancy endpoints.
                    </div>
                </HoloPanel>
            </section>

            {/* 6. FRESHNESS HEATMAP — AWAITING */}
            <section className={styles.freshness}>
                <HoloPanel size="sm" depth="mid" header="DATA FRESHNESS HEATMAP">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Data freshness heatmap will populate once per-source staleness
                        <br />tracking is exposed by the engine.
                    </div>
                </HoloPanel>
            </section>

            {/* 7. RECONCILIATION — AWAITING */}
            <section className={styles.recon}>
                <HoloLabel>RECONCILIATION DASHBOARD</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Reconciliation results will be available once the engine
                        <br />runs its data integrity checks.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
