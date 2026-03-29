'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Types ─────────────────────────────────────────────────── */
interface Signal {
    name: string;
    [key: string]: unknown;
}

/* ── Component ─────────────────────────────────────────────── */
export default function AlphaEnginePage() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=live/signals');
            if (res.ok) {
                const data = await res.json();
                setSignals(data.signals ?? []);
            }
        } catch { /* offline */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                    LOADING ALPHA DATA…
                </div>
            </PageContainer>
        );
    }

    const hasSignals = signals.length > 0;

    return (
        <PageContainer>
            <MonolithNav />

            {/* 1. SIGNAL REGISTRY (LIVE) */}
            <section className={styles.registry}>
                <HoloPanel size="sm" depth="mid" header="SIGNAL REGISTRY — LIVE">
                    {hasSignals ? (
                        <div className={styles.tableScroll}>
                            <table className={styles.sigTable}>
                                <thead>
                                    <tr>
                                        <th>SIGNAL</th>
                                        <th>VALUE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {signals.map((s, i) => (
                                        <tr key={i}>
                                            <td className={styles.sigName}>{s.name ?? `Signal ${i + 1}`}</td>
                                            <td>{JSON.stringify(s)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>◈</div>
                            NO ACTIVE SIGNALS
                            <br /><br />
                            <span style={{ fontSize: '10px', color: 'rgba(224,224,232,0.15)' }}>
                                The engine is running but has not generated any alpha signals yet.
                                <br />Signals will appear here as the alpha engine identifies opportunities.
                            </span>
                        </div>
                    )}
                </HoloPanel>
            </section>

            {/* 2. ALPHA PIPELINE — AWAITING */}
            <section className={styles.pipeline}>
                <HoloLabel>4-LAYER ALPHA STACK PIPELINE</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Pipeline layer details (Feature Aggregator → Alpha Scorer → Meta-Labeler → Kelly Sizer)
                        <br />will be exposed once the engine provides per-layer performance endpoints.
                    </div>
                </HoloPanel>
            </section>

            {/* 3. FEATURE FACTORIES — AWAITING */}
            <section className={styles.factory}>
                <HoloLabel>FEATURE FACTORIES</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Feature factory counts and importance rankings will populate
                        <br />once the engine exposes feature engineering metrics.
                    </div>
                </HoloPanel>
            </section>

            {/* 4. GENETIC ALPHA DISCOVERY — AWAITING */}
            <section className={styles.genetic}>
                <HoloLabel>GENETIC ALPHA DISCOVERY</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Genetic alpha discovery (generation count, champion expressions, diversity scores)
                        <br />will be available once the engine runs the evolutionary signal optimization module.
                    </div>
                </HoloPanel>
            </section>

            {/* 5. SIGNAL GRAVEYARD — AWAITING */}
            <section className={styles.graveyard}>
                <HoloPanel size="sm" depth="mid" header="SIGNAL GRAVEYARD">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        No retired signals. Signals will be moved here when their IC falls below threshold
                        <br />or profit factor drops below 1.0 over a sustained period.
                    </div>
                </HoloPanel>
            </section>

            {/* 6. MODEL PERFORMANCE — AWAITING */}
            <section className={styles.model}>
                <HoloLabel>MODEL PERFORMANCE TRACKER</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Model accuracy, AUC, precision, and recall metrics will populate
                        <br />once the engine provides ML model performance endpoints.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
