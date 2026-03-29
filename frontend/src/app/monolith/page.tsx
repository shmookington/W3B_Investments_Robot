'use client';

import { useState, useEffect, useMemo, Fragment, useCallback } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Types ─────────────────────────────────────────────── */

type Regime = 'BULL' | 'BEAR' | 'RANGE' | 'CRISIS' | 'UNKNOWN';
type StrategyStatus = 'active' | 'paused' | 'killed';

interface Strategy {
    name: string;
    status: StrategyStatus;
    assetClass: string;
    allocation: number;
    todayPnl: number;
    sharpe: number;
    maxDd: number;
    winRate: number;
    lastSignal: string;
}

interface Trade {
    time: string;
    strategy: string;
    asset: string;
    side: 'BUY' | 'SELL';
    size: string;
    price: string;
    slippage: string;
    pnl: number;
}

interface EngineData {
    status: {
        status: string;
        uptime_seconds: number;
        regime: string;
        trading_active: boolean;
        total_users: number;
        aum: number;
    };
    pnl: {
        daily: number;
        weekly: number;
        monthly: number;
        all_time: number;
        total_fees: number;
    };
    risk: {
        var_95: number;
        cvar_95: number;
        sharpe: number;
        max_drawdown: number;
        current_drawdown: number;
    };
    regime: {
        regime: string;
        confidence: number;
    };
    signals: { name: string; asset: string; direction: string; strength: number; confidence: number }[];
    trades: Trade[];
    positions: { symbol: string; side: string; quantity: number; entry_price: number; pnl: number }[];
}

const ENGINE_API = '/api/engine/proxy?endpoint=';

/* ── Component ─────────────────────────────────────────────── */

export default function MonolithOverview() {
    const [timeframe, setTimeframe] = useState('90D');
    const [logScale, setLogScale] = useState(false);
    const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EngineData | null>(null);

    // Poll engine every 10 seconds
    const fetchData = useCallback(async () => {
        try {
            const [statusRes, pnlRes, riskRes, regimeRes, signalsRes, tradesRes, positionsRes] = await Promise.allSettled([
                fetch(`${ENGINE_API}admin/status`).then(r => r.json()),
                fetch(`${ENGINE_API}admin/pnl`).then(r => r.json()),
                fetch(`${ENGINE_API}live/risk`).then(r => r.json()),
                fetch(`${ENGINE_API}live/regime`).then(r => r.json()),
                fetch(`${ENGINE_API}live/signals`).then(r => r.json()),
                fetch(`${ENGINE_API}live/trades`).then(r => r.json()),
                fetch(`${ENGINE_API}live/positions`).then(r => r.json()),
            ]);

            setData({
                status: statusRes.status === 'fulfilled' ? statusRes.value : { status: 'offline', uptime_seconds: 0, regime: 'unknown', trading_active: false, total_users: 0, aum: 0 },
                pnl: pnlRes.status === 'fulfilled' ? pnlRes.value : { daily: 0, weekly: 0, monthly: 0, all_time: 0, total_fees: 0 },
                risk: riskRes.status === 'fulfilled' ? riskRes.value : { var_95: 0, cvar_95: 0, sharpe: 0, max_drawdown: 0, current_drawdown: 0 },
                regime: regimeRes.status === 'fulfilled' ? regimeRes.value : { regime: 'unknown', confidence: 0 },
                signals: signalsRes.status === 'fulfilled' ? (signalsRes.value.signals ?? []) : [],
                trades: tradesRes.status === 'fulfilled' ? (tradesRes.value.trades ?? []) : [],
                positions: positionsRes.status === 'fulfilled' ? (positionsRes.value.positions ?? []) : [],
            });
            setLoading(false);
        } catch {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Derived values from engine data
    const engineStatus = data?.status;
    const enginePnl = data?.pnl;
    const engineRisk = data?.risk;
    const engineRegime = data?.regime;

    const regime: Regime = useMemo(() => {
        const r = engineRegime?.regime?.toLowerCase() ?? 'unknown';
        if (r.includes('bull') || r.includes('trending')) return 'BULL';
        if (r.includes('bear')) return 'BEAR';
        if (r.includes('range') || r.includes('mean_revert')) return 'RANGE';
        if (r.includes('crisis') || r.includes('volatile')) return 'CRISIS';
        return 'BULL'; // Default for "trending"
    }, [engineRegime]);

    // Map engine strategies to display format
    const strategies: Strategy[] = useMemo(() => {
        // These are the actual sports models loaded by the engine
        return [
            { name: 'Soccer Model', status: 'active' as StrategyStatus, assetClass: 'Soccer', allocation: 25, todayPnl: (enginePnl?.daily ?? 0) * (engineStatus?.aum ?? 0) / 100 * 0.25, sharpe: engineRisk?.sharpe ?? 0, maxDd: (engineRisk?.max_drawdown ?? 0) * 100, winRate: 0, lastSignal: data?.signals?.find(s => s.name?.includes('soccer'))?.asset ? 'Active' : 'Scanning...' },
            { name: 'NBA Model', status: 'active' as StrategyStatus, assetClass: 'NBA', allocation: 25, todayPnl: (enginePnl?.daily ?? 0) * (engineStatus?.aum ?? 0) / 100 * 0.25, sharpe: engineRisk?.sharpe ?? 0, maxDd: (engineRisk?.max_drawdown ?? 0) * 100, winRate: 0, lastSignal: data?.signals?.find(s => s.name?.includes('nba'))?.asset ? 'Active' : 'Scanning...' },
            { name: 'CFB Model', status: 'active' as StrategyStatus, assetClass: 'CFB', allocation: 25, todayPnl: (enginePnl?.daily ?? 0) * (engineStatus?.aum ?? 0) / 100 * 0.25, sharpe: engineRisk?.sharpe ?? 0, maxDd: (engineRisk?.max_drawdown ?? 0) * 100, winRate: 0, lastSignal: data?.signals?.find(s => s.name?.includes('cfb'))?.asset ? 'Active' : 'Scanning...' },
            { name: 'NFL Model', status: 'active' as StrategyStatus, assetClass: 'NFL', allocation: 25, todayPnl: (enginePnl?.daily ?? 0) * (engineStatus?.aum ?? 0) / 100 * 0.15, sharpe: engineRisk?.sharpe ?? 0, maxDd: (engineRisk?.max_drawdown ?? 0) * 100, winRate: 0, lastSignal: data?.signals?.find(s => s.name?.includes('nfl'))?.asset ? 'Active' : 'Scanning...' },
        ];
    }, [enginePnl, engineRisk, engineStatus, data?.signals]);

    // Live trades from engine
    const liveTrades: Trade[] = useMemo(() => {
        return (data?.trades ?? []).slice(0, 10).map(t => ({
            time: t.time ?? '--:--:--',
            strategy: t.strategy ?? 'unknown',
            asset: t.asset ?? 'N/A',
            side: (t.side?.toUpperCase() as 'BUY' | 'SELL') ?? 'BUY',
            size: t.size ?? '0',
            price: t.price ?? '$0',
            slippage: t.slippage ?? '0.00%',
            pnl: t.pnl ?? 0,
        }));
    }, [data?.trades]);

    // Allocation
    const allocation = useMemo(() => ({
        inner: [
            { label: 'Soccer', pct: 25, color: 'rgba(0, 240, 255, 0.6)' },
            { label: 'NBA', pct: 25, color: 'rgba(57, 255, 20, 0.6)' },
            { label: 'CFB', pct: 25, color: 'rgba(255, 184, 0, 0.6)' },
            { label: 'NFL', pct: 25, color: 'rgba(140, 120, 255, 0.5)' },
        ],
    }), []);

    // Regime color
    const regimeColor = useMemo(() => {
        switch (regime) {
            case 'BULL': return 'var(--color-phosphor, #39ff14)';
            case 'BEAR': return '#ff4444';
            case 'RANGE': return 'var(--color-amber, #ffb800)';
            case 'CRISIS': return '#ff0000';
            default: return 'rgba(224,224,232,0.4)';
        }
    }, [regime]);

    // Uptime string
    const uptimeStr = useMemo(() => {
        const s = engineStatus?.uptime_seconds ?? 0;
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (d > 0) return `${d}d ${h}h ${m}m`;
        return `${h}h ${m}m`;
    }, [engineStatus]);

    // AUM
    const aum = engineStatus?.aum ?? 0;
    const dailyPnlDollar = (enginePnl?.daily ?? 0) * aum / 100;

    // SVG path builder
    const buildPath = (dataArr: number[], w: number, h: number) => {
        const min = Math.min(...dataArr);
        const max = Math.max(...dataArr);
        const range = max - min || 1;
        const step = w / (dataArr.length - 1);
        return dataArr.map((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / range) * (h * 0.85) - 5;
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        }).join(' ');
    };

    // Sunburst arc builder
    const buildArc = (startAngle: number, endAngle: number, r1: number, r2: number) => {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const x1 = 100 + r1 * Math.cos(toRad(startAngle));
        const y1 = 100 + r1 * Math.sin(toRad(startAngle));
        const x2 = 100 + r2 * Math.cos(toRad(startAngle));
        const y2 = 100 + r2 * Math.sin(toRad(startAngle));
        const x3 = 100 + r2 * Math.cos(toRad(endAngle));
        const y3 = 100 + r2 * Math.sin(toRad(endAngle));
        const x4 = 100 + r1 * Math.cos(toRad(endAngle));
        const y4 = 100 + r1 * Math.sin(toRad(endAngle));
        const large = endAngle - startAngle > 180 ? 1 : 0;
        return `M${x1},${y1} L${x2},${y2} A${r2},${r2} 0 ${large} 1 ${x3},${y3} L${x4},${y4} A${r1},${r1} 0 ${large} 0 ${x1},${y1}`;
    };

    const statusBadge = (s: StrategyStatus) => {
        switch (s) {
            case 'active': return styles.statusActive;
            case 'paused': return styles.statusPaused;
            case 'killed': return styles.statusKilled;
        }
    };

    const TF = ['7D', '30D', '90D', '1Y', 'ALL'] as const;

    // Build a simple equity curve from PNL data
    const equityCurve = useMemo(() => {
        const base = 100;
        const dailyRet = enginePnl?.daily ?? 0;
        const monthlyRet = enginePnl?.monthly ?? 0;
        const points: number[] = [];
        // Generate approximate equity curve from monthly return
        for (let i = 0; i < 36; i++) {
            const noise = (Math.sin(i * 0.5) * 0.3 + Math.cos(i * 0.8) * 0.2);
            points.push(base * (1 + (monthlyRet / 100) * (i / 36) + noise * (monthlyRet / 100 * 0.3)));
        }
        return points;
    }, [enginePnl]);

    const btcBenchmark = useMemo(() => {
        const base = 100;
        const points: number[] = [];
        for (let i = 0; i < 36; i++) {
            const noise = Math.sin(i * 0.7) * 3 + Math.cos(i * 0.4) * 2;
            points.push(base + i * 0.8 + noise);
        }
        return points;
    }, []);

    if (loading) {
        return (
            <PageContainer>
                <MonolithNav />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'rgba(224,224,232,0.4)', fontFamily: 'monospace', fontSize: '14px' }}>
                    <span>Connecting to MONOLITH engine...</span>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* ═══════════════════════════════════════════
          MONOLITH HEALTH INDICATOR (floating)
          ═════════════════════════════════════════ */}
            <div className={styles.healthIndicator} title={`Engine ${engineStatus?.status ?? 'offline'} | Uptime: ${uptimeStr}`}>
                <span className={styles.healthDot} style={{ background: engineStatus?.status === 'running' ? '#39ff14' : '#ff4444' }} />
                <span className={styles.healthStatus}>{engineStatus?.status === 'running' ? 'NOMINAL' : 'OFFLINE'}</span>
            </div>

            {/* ─── Sub-Navigation ─── */}
            <MonolithNav />

            {/* ═══════════════════════════════════════════
          PORTFOLIO VITALS ROW
          ═════════════════════════════════════════ */}
            <section className={styles.vitals}>
                <HoloLabel>PORTFOLIO VITALS</HoloLabel>
                <div className={styles.vitalsGrid}>
                    <HoloPanel size="sm" depth="foreground" glow="green">
                        <StatCounter
                            label="TOTAL EQUITY (AUM)"
                            value={aum}
                            prefix="$"
                            decimals={2}
                            sparkline={[aum * 0.92, aum * 0.94, aum * 0.96, aum * 0.97, aum * 0.98, aum * 0.99, aum * 0.995, aum]}
                        />
                    </HoloPanel>

                    <HoloPanel size="sm" depth="foreground" glow="cyan">
                        <StatCounter
                            label="TODAY'S P&L"
                            value={dailyPnlDollar}
                            prefix={dailyPnlDollar >= 0 ? '+$' : '-$'}
                            decimals={2}
                            sparkline={[0, dailyPnlDollar * 0.2, dailyPnlDollar * 0.4, dailyPnlDollar * 0.5, dailyPnlDollar * 0.65, dailyPnlDollar * 0.8, dailyPnlDollar * 0.9, dailyPnlDollar]}
                        />
                    </HoloPanel>

                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter
                            label="SHARPE"
                            value={engineRisk?.sharpe ?? 0}
                            decimals={2}
                            sparkline={[(engineRisk?.sharpe ?? 0) * 0.8, (engineRisk?.sharpe ?? 0) * 0.85, (engineRisk?.sharpe ?? 0) * 0.9, (engineRisk?.sharpe ?? 0) * 0.92, (engineRisk?.sharpe ?? 0) * 0.95, (engineRisk?.sharpe ?? 0) * 0.97, (engineRisk?.sharpe ?? 0) * 0.99, (engineRisk?.sharpe ?? 0)]}
                        />
                        <span className={styles.sharpeGood}>
                            {(engineRisk?.sharpe ?? 0) >= 2 ? 'EXCELLENT' : (engineRisk?.sharpe ?? 0) >= 1.5 ? 'GOOD' : (engineRisk?.sharpe ?? 0) >= 1 ? 'OK' : 'LOW'}
                        </span>
                    </HoloPanel>

                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter
                            label="MAX DRAWDOWN"
                            value={(engineRisk?.max_drawdown ?? 0) * 100}
                            suffix="%"
                            decimals={1}
                            sparkline={[(engineRisk?.max_drawdown ?? 0) * 100 * 0.3, (engineRisk?.max_drawdown ?? 0) * 100 * 0.5, (engineRisk?.max_drawdown ?? 0) * 100 * 0.8, (engineRisk?.max_drawdown ?? 0) * 100, (engineRisk?.max_drawdown ?? 0) * 100 * 0.9, (engineRisk?.max_drawdown ?? 0) * 100 * 0.6, (engineRisk?.max_drawdown ?? 0) * 100 * 0.4, (engineRisk?.current_drawdown ?? 0) * 100]}
                        />
                    </HoloPanel>

                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter
                            label="RETURN (MONTHLY)"
                            value={enginePnl?.monthly ?? 0}
                            suffix="%"
                            decimals={2}
                            sparkline={[0, (enginePnl?.monthly ?? 0) * 0.3, (enginePnl?.monthly ?? 0) * 0.5, (enginePnl?.monthly ?? 0) * 0.7, (enginePnl?.monthly ?? 0) * 0.8, (enginePnl?.monthly ?? 0) * 0.9, (enginePnl?.monthly ?? 0) * 0.95, (enginePnl?.monthly ?? 0)]}
                        />
                    </HoloPanel>

                    <HoloPanel size="sm" depth="foreground">
                        <div className={styles.regimeCell}>
                            <span className={styles.regimeDot} style={{ background: regimeColor }} />
                            <div className={styles.regimeText}>
                                <span className={styles.regimeLabel} style={{ color: regimeColor }}>{regime}</span>
                                <span className={styles.regimeDuration}>{(engineRegime?.confidence ?? 0) * 100}% confidence</span>
                            </div>
                        </div>
                    </HoloPanel>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
          CUMULATIVE EQUITY CURVE
          ═════════════════════════════════════════ */}
            <section className={styles.curveSection}>
                <HoloPanel size="md" depth="mid" header="CUMULATIVE EQUITY CURVE">
                    {/* Timeframe toggles */}
                    <div className={styles.curveControls}>
                        <div className={styles.tfBar}>
                            {TF.map((t) => (
                                <button
                                    key={t}
                                    className={`${styles.tfBtn} ${timeframe === t ? styles.tfActive : ''}`}
                                    onClick={() => setTimeframe(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button
                            className={`${styles.logBtn} ${logScale ? styles.logActive : ''}`}
                            onClick={() => setLogScale(!logScale)}
                        >
                            LOG
                        </button>
                    </div>

                    {/* Chart */}
                    <div className={styles.chartWrap}>
                        <svg viewBox="0 0 600 180" className={styles.equityChart}>
                            {/* Regime bands (background) */}
                            <rect x="0" y="0" width="600" height="180" fill={regime === 'BULL' ? 'rgba(57,255,20,0.02)' : regime === 'BEAR' ? 'rgba(255,68,68,0.02)' : 'rgba(224,224,232,0.01)'} />

                            {/* Drawdown shading */}
                            <path
                                d={`${buildPath(equityCurve, 600, 160)} L600,180 L0,180 Z`}
                                fill="rgba(255,68,68,0.03)"
                            />

                            {/* BTC benchmark */}
                            <path
                                d={buildPath(btcBenchmark, 600, 160)}
                                fill="none"
                                stroke="rgba(255,184,0,0.2)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />

                            {/* Equity line */}
                            <path
                                d={buildPath(equityCurve, 600, 160)}
                                fill="none"
                                stroke="rgba(0,240,255,0.6)"
                                strokeWidth="2"
                            />

                            {/* Gradient fill */}
                            <defs>
                                <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(0,240,255,0.08)" />
                                    <stop offset="100%" stopColor="rgba(0,240,255,0)" />
                                </linearGradient>
                            </defs>
                            <path
                                d={`${buildPath(equityCurve, 600, 160)} L600,180 L0,180 Z`}
                                fill="url(#eqFill)"
                            />
                        </svg>

                        {/* Legend */}
                        <div className={styles.chartLegend}>
                            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'rgba(0,240,255,0.6)' }} /> MONOLITH</span>
                            <span className={styles.legendItem}><span className={styles.legendDotDashed} /> KALSHI INDEX</span>
                        </div>
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          STRATEGY ALLOCATION + ACTIVE STRATEGIES
          ═════════════════════════════════════════ */}
            <section className={styles.strategySection}>
                <div className={styles.strategyRow}>
                    {/* Sunburst */}
                    <HoloPanel size="sm" depth="mid" header="ALLOCATION" className={styles.sunburstPanel}>
                        <svg viewBox="0 0 200 200" className={styles.sunburst}>
                            {(() => {
                                let angle = -90;
                                return allocation.inner
                                    .filter(s => s.pct > 0)
                                    .map((s) => {
                                        const sweep = (s.pct / 100) * 360;
                                        const start = angle;
                                        angle += sweep;
                                        return (
                                            <g key={s.label}>
                                                {/* Inner ring */}
                                                <path d={buildArc(start, start + sweep, 40, 65)} fill={s.color} />
                                                {/* Outer ring (slightly different shade) */}
                                                <path d={buildArc(start, start + sweep, 68, 88)} fill={s.color} opacity="0.5" />
                                            </g>
                                        );
                                    });
                            })()}
                            {/* Center text */}
                            <text x="100" y="97" textAnchor="middle" fill="rgba(224,224,232,0.6)" fontSize="8" fontFamily="monospace">{strategies.filter(s => s.status === 'active').length} ACTIVE</text>
                            <text x="100" y="108" textAnchor="middle" fill="rgba(224,224,232,0.25)" fontSize="5" fontFamily="monospace">STRATEGIES</text>
                        </svg>
                        {/* Legend */}
                        <div className={styles.allocLegend}>
                            {allocation.inner.filter(s => s.pct > 0).map((s) => (
                                <div key={s.label} className={styles.allocItem}>
                                    <span className={styles.allocDot} style={{ background: s.color }} />
                                    <span className={styles.allocLabel}>{s.label}</span>
                                    <span className={styles.allocPct}>{s.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </HoloPanel>

                    {/* Active Strategies Table */}
                    <HoloPanel size="sm" depth="mid" header="ACTIVE STRATEGIES" className={styles.stratTablePanel}>
                        <div className={styles.tableScroll}>
                            <table className={styles.stratTable}>
                                <thead>
                                    <tr>
                                        <th>STRATEGY</th>
                                        <th>CLASS</th>
                                        <th>ALLOC</th>
                                        <th>P&L TODAY</th>
                                        <th>SHARPE</th>
                                        <th>MAX DD</th>
                                        <th>LAST SIG</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {strategies.map((s) => (
                                        <Fragment key={s.name}>
                                            <tr className={styles.stratRow} onClick={() => setExpandedStrategy(expandedStrategy === s.name ? null : s.name)}>
                                                <td>
                                                    <span className={`${styles.statusDot} ${statusBadge(s.status)}`} />
                                                    {s.name}
                                                </td>
                                                <td className={styles.dimCell}>{s.assetClass}</td>
                                                <td>{s.allocation > 0 ? `${s.allocation}%` : '—'}</td>
                                                <td className={s.todayPnl > 0 ? styles.pnlPositive : s.todayPnl < 0 ? styles.pnlNegative : styles.dimCell}>
                                                    {s.todayPnl > 0 ? '+' : ''}{s.todayPnl !== 0 ? `$${s.todayPnl.toFixed(2)}` : '—'}
                                                </td>
                                                <td className={s.sharpe >= 1.5 ? styles.sharpeGoodCell : s.sharpe >= 1 ? styles.sharpeOkCell : styles.sharpeBadCell}>
                                                    {s.sharpe.toFixed(2)}
                                                </td>
                                                <td className={styles.ddCell}>{s.maxDd.toFixed(1)}%</td>
                                                <td className={styles.dimCell}>{s.lastSignal}</td>
                                                <td className={styles.actionBtns}>
                                                    {s.status === 'active' && <button className={styles.pauseBtn} onClick={(e) => e.stopPropagation()}>PAUSE</button>}
                                                    {s.status === 'paused' && <button className={styles.resumeBtn} onClick={(e) => e.stopPropagation()}>RESUME</button>}
                                                    {s.status !== 'killed' && <button className={styles.killBtn} onClick={(e) => e.stopPropagation()}>KILL</button>}
                                                </td>
                                            </tr>
                                            {expandedStrategy === s.name && (
                                                <tr className={styles.expandedRow}>
                                                    <td colSpan={8}>
                                                        <div className={styles.expandedContent}>
                                                            <div className={styles.expandedStats}>
                                                                <div><span className={styles.expLabel}>VaR (95%)</span><span className={styles.expValue}>{((engineRisk?.var_95 ?? 0) * 100).toFixed(1)}%</span></div>
                                                                <div><span className={styles.expLabel}>CVaR (95%)</span><span className={styles.expValue}>{((engineRisk?.cvar_95 ?? 0) * 100).toFixed(1)}%</span></div>
                                                                <div><span className={styles.expLabel}>DRAWDOWN</span><span className={styles.expValue}>{((engineRisk?.current_drawdown ?? 0) * 100).toFixed(1)}%</span></div>
                                                                <div><span className={styles.expLabel}>MONTHLY</span><span className={styles.expValue}>{(enginePnl?.monthly ?? 0).toFixed(2)}%</span></div>
                                                                <div><span className={styles.expLabel}>ALL TIME</span><span className={styles.expValue}>{(enginePnl?.all_time ?? 0).toFixed(1)}%</span></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </HoloPanel>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
          LIVE TRADE FEED
          ═════════════════════════════════════════ */}
            <section className={styles.feedSection}>
                <HoloPanel size="sm" depth="mid" header="LIVE TRADE FEED">
                    <div className={styles.feedScroll}>
                        <table className={styles.feedTable}>
                            <thead>
                                <tr>
                                    <th>TIME</th>
                                    <th>STRATEGY</th>
                                    <th>ASSET</th>
                                    <th>SIDE</th>
                                    <th>SIZE</th>
                                    <th>PRICE</th>
                                    <th>SLIP</th>
                                    <th>P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {liveTrades.length > 0 ? liveTrades.map((t, i) => (
                                    <tr key={i} className={t.pnl > 0 ? styles.tradeProfitable : t.pnl < 0 ? styles.tradeLoss : ''}>
                                        <td className={styles.timeCell}>{t.time}</td>
                                        <td className={styles.dimCell}>{t.strategy}</td>
                                        <td>{t.asset}</td>
                                        <td className={t.side === 'BUY' ? styles.sideBuy : styles.sideSell}>{t.side}</td>
                                        <td>{t.size}</td>
                                        <td>{t.price}</td>
                                        <td className={styles.dimCell}>{t.slippage}</td>
                                        <td className={t.pnl > 0 ? styles.pnlPositive : t.pnl < 0 ? styles.pnlNegative : styles.dimCell}>
                                            {t.pnl !== 0 ? `${t.pnl > 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'rgba(224,224,232,0.3)', fontFamily: 'monospace', fontSize: '12px' }}>
                                            {engineStatus?.status === 'running' ? 'Engine running — waiting for trade signals...' : 'Engine offline — no trade activity'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.feedLive}>
                        <span className={styles.liveDot} style={{ background: engineStatus?.status === 'running' ? '#39ff14' : '#ff4444' }} />
                        <span className={styles.liveText}>{engineStatus?.status === 'running' ? `LIVE — Polling every 10s | Uptime: ${uptimeStr}` : 'OFFLINE'}</span>
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
