'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Types ─────────────────────────────────────────────────── */
interface RegimeData {
    regime: string;
    confidence: number;
}

type Regime = 'BULL' | 'BEAR' | 'HIGH_VOL' | 'CRISIS' | 'RANGE' | 'TRENDING' | 'NOVEL';

/* ── Helpers ────────────────────────────────────────────────── */
const regimeColor = (r: string) => {
    const upper = r?.toUpperCase() ?? '';
    switch (upper) {
        case 'BULL': case 'TRENDING': return '#39ff14';
        case 'BEAR': return '#ff4444';
        case 'HIGH_VOL': return '#ff8800';
        case 'CRISIS': return '#ff0000';
        case 'RANGE': case 'MEAN_REVERTING': return '#ffb800';
        case 'NOVEL': return '#ff00ff';
        default: return '#00f0ff';
    }
};

/* ── Component ─────────────────────────────────────────────── */
export default function RegimeEnginePage() {
    const [regime, setRegime] = useState<RegimeData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=live/regime');
            if (res.ok) setRegime(await res.json());
        } catch { /* offline */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                    LOADING REGIME DATA…
                </div>
            </PageContainer>
        );
    }

    const offline = !regime;
    const currentRegime = regime?.regime?.toUpperCase() ?? 'UNKNOWN';
    const confidence = regime ? Math.round(regime.confidence * 100) : 0;

    return (
        <PageContainer>
            <MonolithNav />

            {/* 1. CURRENT REGIME HERO (LIVE) */}
            <section className={styles.regimeHero} style={{ borderColor: offline ? '#ff4444' : regimeColor(currentRegime) }}>
                <div className={styles.heroInner}>
                    <div className={styles.heroLeft}>
                        <span className={styles.regimeSmallLabel}>CURRENT REGIME (LIVE)</span>
                        <h1 className={styles.regimeTitle} style={{ color: offline ? '#ff4444' : regimeColor(currentRegime) }}>
                            {offline ? 'OFFLINE' : currentRegime}
                        </h1>
                        {!offline && (
                            <span className={styles.regimeDuration}>Confidence: {confidence}%</span>
                        )}
                    </div>
                    {!offline && (
                        <div className={styles.heroBars}>
                            <div className={styles.probRow}>
                                <span className={styles.probLabel}>{currentRegime}</span>
                                <div className={styles.probTrack}>
                                    <div className={styles.probFill} style={{ width: `${confidence}%`, background: regimeColor(currentRegime) }} />
                                </div>
                                <span className={styles.probPct}>{confidence}%</span>
                            </div>
                            <div className={styles.probRow}>
                                <span className={styles.probLabel}>OTHER</span>
                                <div className={styles.probTrack}>
                                    <div className={styles.probFill} style={{ width: `${100 - confidence}%`, background: 'rgba(224,224,232,0.15)' }} />
                                </div>
                                <span className={styles.probPct}>{100 - confidence}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 2. REGIME CONFIDENCE GAUGE */}
            {!offline && (
                <section className={styles.consensus}>
                    <HoloLabel>REGIME CONFIDENCE</HoloLabel>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <HoloPanel size="sm" depth="foreground">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                                <HoloGauge value={confidence} label="CONFIDENCE" size={120} />
                                <span style={{ marginTop: '8px', color: regimeColor(currentRegime), fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                                    {currentRegime} — {confidence}%
                                </span>
                            </div>
                        </HoloPanel>
                    </div>
                </section>
            )}

            {/* 3. MULTI-METHOD CONSENSUS — AWAITING */}
            <section className={styles.consensus}>
                <HoloLabel>MULTI-METHOD CONSENSUS</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Multi-method consensus (K-Means, GMM, HMM, BCP) details will be exposed
                        <br />once the engine provides per-detector breakdown endpoints.
                        <br /><br />
                        Currently using aggregate regime: <span style={{ color: regimeColor(currentRegime) }}>{currentRegime}</span> at {confidence}% confidence.
                    </div>
                </HoloPanel>
            </section>

            {/* 4. REGIME HISTORY TIMELINE — AWAITING */}
            <section className={styles.timeline}>
                <HoloPanel size="md" depth="mid" header="REGIME HISTORY TIMELINE">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Regime history timeline will populate as the engine accumulates regime transition data over time.
                        <br />The engine needs to run for several regime cycles to build a meaningful timeline.
                    </div>
                </HoloPanel>
            </section>

            {/* 5. HIERARCHICAL REGIME TREE — AWAITING */}
            <section className={styles.hierarchy}>
                <HoloLabel>HIERARCHICAL REGIME TREE</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Hierarchical regime tree (League → Sport → Model) will populate
                        <br />once the engine exposes multi-level regime classification endpoints.
                    </div>
                </HoloPanel>
            </section>

            {/* 6. TRANSITION PROBABILITIES — AWAITING */}
            <section className={styles.transitions}>
                <HoloPanel size="sm" depth="mid" header="REGIME TRANSITION PROBABILITIES">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Transition probability matrix requires sufficient regime history.
                        <br />Will populate as the engine logs regime changes over time.
                    </div>
                </HoloPanel>
            </section>

            {/* 7. LEADING INDICATORS — AWAITING */}
            <section className={styles.indicators}>
                <HoloLabel>LEADING INDICATORS</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Leading indicator feeds (injury reports, lineup data, weather conditions, odds movement)
                        <br />will be available once the engine exposes market data endpoints.
                    </div>
                </HoloPanel>
            </section>

            {/* 8. REGIME ADAPTATION — AWAITING */}
            <section className={styles.adaptation}>
                <HoloPanel size="sm" depth="mid" header="REGIME ADAPTATION — STRATEGY WEIGHTS">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Regime-adapted strategy weights will appear once the engine provides
                        <br />strategy allocation data per regime state.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
