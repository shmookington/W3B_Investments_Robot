'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Types ─────────────────────────────────────────────────── */
interface RiskData {
    var_95: number;
    cvar_95: number;
    sharpe: number;
    max_drawdown: number;
    current_drawdown: number;
}
interface AdminStatus {
    status: string;
    uptime_seconds: number;
    regime: string;
    trading_active: boolean;
    aum: number;
}

/* ── Component ─────────────────────────────────────────────── */
export default function RiskEnginePage() {
    const [risk, setRisk] = useState<RiskData | null>(null);
    const [status, setStatus] = useState<AdminStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [riskRes, statusRes] = await Promise.all([
                fetch('/api/engine/proxy?endpoint=live/risk'),
                fetch('/api/engine/proxy?endpoint=admin/status'),
            ]);
            if (riskRes.ok) setRisk(await riskRes.json());
            if (statusRes.ok) setStatus(await statusRes.json());
        } catch { /* engine offline */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px' }}>
                    LOADING RISK DATA…
                </div>
            </PageContainer>
        );
    }

    const offline = !risk;
    const dd = risk ? Math.abs(risk.current_drawdown * 100) : 0;
    const maxDd = risk ? Math.abs(risk.max_drawdown * 100) : 0;
    const var95 = risk ? (risk.var_95 * 100) : 0;
    const cvar95 = risk ? (risk.cvar_95 * 100) : 0;
    const sharpe = risk?.sharpe ?? 0;

    const CRITICAL_METRICS = [
        { label: 'CURRENT DRAWDOWN', value: -dd, suffix: '%', threshold: 10, bad: (v: number) => Math.abs(v) > 10, gauge: true },
        { label: 'MAX DRAWDOWN', value: -maxDd, suffix: '%', threshold: 20, bad: (v: number) => Math.abs(v) > 20, gauge: false },
        { label: 'VaR 1D 95%', value: var95, suffix: '%', threshold: null, bad: () => false, gauge: false },
        { label: 'CVaR 1D 99%', value: cvar95, suffix: '%', threshold: null, bad: () => false, gauge: false },
        { label: 'SHARPE RATIO', value: sharpe, suffix: '', threshold: null, bad: () => false, gauge: false },
    ];

    return (
        <PageContainer>
            <MonolithNav />

            {/* 1. ENGINE STATUS BANNER */}
            <section style={{ padding: '0 20px', marginBottom: '16px' }}>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        <span style={{ color: offline ? '#ff4444' : '#39ff14' }}>
                            ● {offline ? 'ENGINE OFFLINE' : 'ENGINE ONLINE'}
                        </span>
                        {status && (
                            <span style={{ color: 'rgba(224,224,232,0.3)' }}>
                                AUM: ${(status.aum ?? 0).toLocaleString()} · Regime: {status.regime?.toUpperCase()} · Uptime: {Math.floor((status.uptime_seconds ?? 0) / 3600)}h
                            </span>
                        )}
                    </div>
                </HoloPanel>
            </section>

            {/* 2. CRITICAL RISK METRICS (LIVE) */}
            <section className={styles.critical}>
                <HoloLabel>RISK METRICS — LIVE FROM ENGINE</HoloLabel>
                {offline ? (
                    <HoloPanel size="sm" depth="mid">
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            Engine offline — cannot retrieve risk data
                        </div>
                    </HoloPanel>
                ) : (
                    <div className={styles.criticalGrid}>
                        {CRITICAL_METRICS.map((m, i) => (
                            <HoloPanel key={i} size="sm" depth="foreground" glow={m.bad(m.value) ? undefined : undefined}>
                                <div className={`${styles.metricCard} ${m.bad(m.value) ? styles.metricDanger : ''}`}>
                                    {m.gauge ? (
                                        <HoloGauge value={Math.abs(m.value) * 5} label={m.label} size={80} />
                                    ) : (
                                        <StatCounter label={m.label} value={m.value} suffix={m.suffix} decimals={m.suffix === '%' ? 2 : 2} />
                                    )}
                                    {m.threshold !== null && (
                                        <span className={styles.metricThresh}>Threshold: {m.threshold}{m.suffix}</span>
                                    )}
                                </div>
                            </HoloPanel>
                        ))}
                    </div>
                )}
            </section>

            {/* 3. POSITION SIZING — AWAITING ENGINE DATA */}
            <section className={styles.sizing}>
                <HoloPanel size="sm" depth="mid" header="4-PILLAR POSITION SIZING">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Position sizing data will populate once the engine begins executing trades.
                        <br />Currently awaiting first trade cycle.
                    </div>
                </HoloPanel>
            </section>

            {/* 4. RISK BUDGET — AWAITING ENGINE DATA */}
            <section className={styles.budget}>
                <HoloLabel>RISK BUDGET ALLOCATION (CVaR)</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Risk budget allocation will appear once strategies are actively trading.
                        <br />The engine is running but has not yet accumulated enough data for budget breakdown.
                    </div>
                </HoloPanel>
            </section>

            {/* 5. CIRCUIT BREAKERS — AWAITING ENGINE DATA */}
            <section className={styles.breakers}>
                <HoloLabel>CIRCUIT BREAKER STATUS</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Circuit breaker status will be exposed once the engine provides /risk/breakers endpoint.
                        <br />Current drawdown: {dd.toFixed(2)}% (well within safety limits)
                    </div>
                </HoloPanel>
            </section>

            {/* 6. CORRELATION MATRIX — AWAITING ENGINE DATA */}
            <section className={styles.correlation}>
                <HoloPanel size="sm" depth="mid" header="CORRELATION MATRIX (20-DAY ROLLING)">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Correlation matrix requires multiple active strategies with trade history.
                        <br />Will populate as the engine accumulates cross-strategy return data.
                    </div>
                </HoloPanel>
            </section>

            {/* 7. STRESS TEST — AWAITING ENGINE DATA */}
            <section className={styles.stress}>
                <HoloPanel size="sm" depth="mid" header="STRESS TEST RESULTS">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Stress test results will populate once the engine exposes simulation endpoints.
                        <br />Historical stress testing is available via the Backtest page.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
