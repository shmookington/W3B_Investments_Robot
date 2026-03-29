'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Types ─────────────────────────────────────────────────── */
interface Position {
    asset?: string;
    side?: string;
    size?: number;
    entry_price?: number;
    pnl?: number;
    [key: string]: unknown;
}

/* ── Component ─────────────────────────────────────────────── */
export default function PortfolioConstructionPage() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=live/positions');
            if (res.ok) {
                const data = await res.json();
                setPositions(data.positions ?? []);
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
                    LOADING PORTFOLIO DATA…
                </div>
            </PageContainer>
        );
    }

    const hasPositions = positions.length > 0;

    return (
        <PageContainer>
            <MonolithNav />

            {/* 1. CURRENT POSITIONS (LIVE) */}
            <section className={styles.allocation}>
                <HoloLabel>CURRENT PORTFOLIO — LIVE POSITIONS</HoloLabel>
                {hasPositions ? (
                    <div className={styles.allocRow}>
                        <HoloPanel size="sm" depth="mid">
                            <table className={styles.allocTable}>
                                <thead><tr><th>ASSET</th><th>SIDE</th><th>SIZE</th><th>ENTRY</th><th>P&L</th></tr></thead>
                                <tbody>
                                    {positions.map((p, i) => (
                                        <tr key={i}>
                                            <td>{p.asset ?? '—'}</td>
                                            <td style={{ color: p.side === 'LONG' ? '#39ff14' : '#ff4444' }}>{p.side ?? '—'}</td>
                                            <td>{p.size ?? '—'}</td>
                                            <td>{p.entry_price ?? '—'}</td>
                                            <td style={{ color: (p.pnl ?? 0) >= 0 ? '#39ff14' : '#ff4444' }}>
                                                {p.pnl !== undefined ? `${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}%` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </HoloPanel>
                    </div>
                ) : (
                    <HoloPanel size="sm" depth="mid">
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>◈</div>
                            NO ACTIVE POSITIONS
                            <br /><br />
                            <span style={{ fontSize: '10px', color: 'rgba(224,224,232,0.15)' }}>
                                The engine is running but has not opened any positions yet.
                                <br />Positions will appear here in real-time as trades are executed.
                            </span>
                        </div>
                    </HoloPanel>
                )}
            </section>

            {/* 2. CONSTRUCTION PIPELINE INFO */}
            <section className={styles.stack}>
                <HoloLabel>CONSTRUCTION STACK — 4-LEVEL PIPELINE</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Portfolio construction pipeline details (HRP Weights → Black-Litterman → Resampled Frontier → Constraints)
                        <br />will be exposed once the engine provides construction layer endpoints.
                    </div>
                </HoloPanel>
            </section>

            {/* 3. COVARIANCE ESTIMATOR — AWAITING */}
            <section className={styles.covariance}>
                <HoloLabel>COVARIANCE ESTIMATOR</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Covariance matrix (Sample, Ledoit-Wolf, OAS, RMT) will populate
                        <br />once the engine accumulates sufficient return history across strategies.
                    </div>
                </HoloPanel>
            </section>

            {/* 4. REBALANCE MONITOR — AWAITING */}
            <section className={styles.rebalance}>
                <HoloPanel size="sm" depth="mid" header="REBALANCE MONITOR">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Rebalance drift monitoring will activate once positions are established
                        <br />and target allocations are set.
                    </div>
                </HoloPanel>
            </section>

            {/* 5. CAPACITY MONITOR — AWAITING */}
            <section className={styles.capacity}>
                <HoloLabel>CAPACITY MONITOR</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Strategy capacity monitoring will activate as the engine deploys capital
                        <br />and approaches venue-specific volume limits.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
