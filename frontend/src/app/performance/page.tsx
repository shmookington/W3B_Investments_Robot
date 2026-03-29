'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { MonthlyReturnsHeatmap } from '@/components/charts/MonthlyReturnsHeatmap';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import {
    filterByTimeRange,
    normalizeToPercent,
    type EquityDataPoint,
    type MonthlyReturn,
    type TimeRange,
} from '@/lib/mockPerformanceData';
import styles from './page.module.css';

/* ─── Risk level → gauge value mapping ─── */
function riskLevelToGauge(level: string): number {
    if (level === 'Conservative') return 30;
    if (level === 'Moderate') return 55;
    return 80;
}

/* ─── Regime badge class ─── */
function regimeClass(regime: string): string {
    if (regime === 'BULL') return styles.regimeBull;
    if (regime === 'BEAR') return styles.regimeBear;
    return styles.regimeRange;
}

export default function PerformancePage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('90D');

    /* ─── Live equity curve from API ─── */
    const [equityRaw, setEquityRaw] = useState<EquityDataPoint[]>([]);
    const [equityLoading, setEquityLoading] = useState(true);

    useEffect(() => {
        async function fetchEquity() {
            try {
                const res = await fetch('/api/portfolio/equity-curve');
                if (res.ok) {
                    const json = await res.json();
                    const raw = json.data ?? json;
                    if (Array.isArray(raw) && raw.length >= 2) {
                        setEquityRaw(raw.map((p: { date: string; equity?: number; value?: number; nav?: number }) => ({
                            date: p.date,
                            equity: p.equity ?? p.value ?? p.nav ?? 0,
                            btc: 0, eth: 0, sp500: 0,
                        })));
                    }
                }
            } catch { /* API unavailable */ }
            setEquityLoading(false);
        }
        fetchEquity();
    }, []);

    const chartData = useMemo(() => {
        if (equityRaw.length < 2) return [];
        return normalizeToPercent(filterByTimeRange(equityRaw, timeRange));
    }, [equityRaw, timeRange]);

    /* ─── Live monthly returns from API ─── */
    const [monthlyData, setMonthlyData] = useState<MonthlyReturn[]>([]);

    useEffect(() => {
        async function fetchMonthly() {
            try {
                const res = await fetch('/api/portfolio/by-month');
                if (res.ok) {
                    const json = await res.json();
                    const raw = json.data ?? json;
                    if (Array.isArray(raw)) {
                        // API may return {year, months: number[]} or {year, month, value}
                        const mapped: MonthlyReturn[] = [];
                        for (const row of raw) {
                            if (Array.isArray(row.months)) {
                                // Grouped format: {year: 2026, months: [1.2, -0.5, ...]}
                                row.months.forEach((val: number | null, idx: number) => {
                                    if (val !== null && val !== undefined) {
                                        mapped.push({ year: row.year, month: idx + 1, value: val });
                                    }
                                });
                            } else if (row.month !== undefined && row.value !== undefined) {
                                // Already in MonthlyReturn format
                                mapped.push({ year: row.year, month: row.month, value: row.value });
                            }
                        }
                        setMonthlyData(mapped);
                    }
                }
            } catch { /* API unavailable */ }
        }
        fetchMonthly();
    }, []);

    /* ─── Live key metrics from API ─── */
    const [metrics, setMetrics] = useState<{
        totalReturn: number | null;
        annualizedReturn: number | null;
        sharpeRatio: number | null;
        sortinoRatio: number | null;
        maxDrawdown: number | null;
        winRate: number | null;
        calmarRatio: number | null;
        profitFactor: number | null;
        totalPositions: number | null;
    }>({
        totalReturn: null, annualizedReturn: null, sharpeRatio: null,
        sortinoRatio: null, maxDrawdown: null, winRate: null,
        calmarRatio: null, profitFactor: null, totalPositions: null,
    });

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const [portfolioRes, riskRes] = await Promise.all([
                    fetch('/api/portfolio/summary'),
                    fetch('/api/risk/metrics'),
                ]);
                const p = portfolioRes.ok ? ((await portfolioRes.json()).data ?? await portfolioRes.json()) : null;
                const r = riskRes.ok ? ((await riskRes.json()).data ?? await riskRes.json()) : null;

                setMetrics({
                    totalReturn: p?.totalReturnPct ?? p?.totalReturn ?? null,
                    annualizedReturn: p?.annualizedReturn ?? r?.annualizedReturn ?? null,
                    sharpeRatio: r?.sharpe ?? r?.sharpeRatio ?? null,
                    sortinoRatio: r?.sortino ?? r?.sortinoRatio ?? null,
                    maxDrawdown: r?.maxDrawdown ?? r?.max_drawdown ?? null,
                    winRate: r?.winRate ?? r?.win_rate ?? null,
                    calmarRatio: r?.calmar ?? r?.calmarRatio ?? null,
                    profitFactor: r?.profitFactor ?? r?.profit_factor ?? null,
                    totalPositions: p?.totalPositions ?? p?.tradeCount ?? null,
                });
            } catch { /* API unavailable */ }
        }
        fetchMetrics();
    }, []);

    /* ─── Live risk summary from API ─── */
    const [risk, setRisk] = useState<{
        regime: string;
        drawdownFromPeak: number;
        activeStrategies: number;
        riskLevel: string;
    }>({ regime: '—', drawdownFromPeak: 0, activeStrategies: 0, riskLevel: 'Moderate' });

    useEffect(() => {
        async function fetchRisk() {
            try {
                const res = await fetch('/api/risk/metrics');
                if (res.ok) {
                    const json = await res.json();
                    const d = json.data ?? json;
                    setRisk({
                        regime: d.regime ?? d.marketRegime ?? '—',
                        drawdownFromPeak: d.currentDrawdown ?? d.drawdownFromPeak ?? 0,
                        activeStrategies: d.activeModels ?? d.activeStrategies ?? 0,
                        riskLevel: d.riskLevel ?? 'Moderate',
                    });
                }
            } catch { /* API unavailable */ }
        }
        fetchRisk();
    }, []);

    /* ─── Metric display config (wired to live data) ─── */
    const METRICS_DISPLAY = [
        { key: 'totalReturn', label: 'Total Return', value: metrics.totalReturn, suffix: '%', positive: true },
        { key: 'annualizedReturn', label: 'Annual Return', value: metrics.annualizedReturn, suffix: '%', positive: true },
        { key: 'sharpeRatio', label: 'Sharpe Ratio', value: metrics.sharpeRatio, suffix: '', positive: true },
        { key: 'sortinoRatio', label: 'Sortino', value: metrics.sortinoRatio, suffix: '', positive: true },
        { key: 'maxDrawdown', label: 'Max Drawdown', value: metrics.maxDrawdown, suffix: '%', positive: false },
        { key: 'winRate', label: 'Directional Accuracy', value: metrics.winRate, suffix: '%', positive: true },
        { key: 'calmarRatio', label: 'Calmar', value: metrics.calmarRatio, suffix: '', positive: true },
    ];

    return (
        <PageContainer>
            {/* PAGE HEADER */}
            <motion.section
                className={styles.pageHeader}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <HoloLabel>PERFORMANCE ANALYTICS</HoloLabel>
                <h1 className={styles.pageTitle}>Fund Performance</h1>
                <p className={styles.pageSubtitle}>
                    Verified returns, fully transparent. Aggregate fund performance across all probability models.
                </p>
            </motion.section>

            {/* EQUITY CURVE — Live from API */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeInUp}
            >
                <span className={styles.sectionLabel}>EQUITY CURVE</span>
                <h2 className={styles.sectionTitle}>Fund equity over time</h2>
                <HoloPanel size="lg" depth="foreground" className={styles.chartPanel}>
                    {equityLoading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            LOADING EQUITY DATA…
                        </div>
                    ) : chartData.length >= 2 ? (
                        <EquityCurveChart
                            data={chartData}
                            activeRange={timeRange}
                            onRangeChange={setTimeRange}
                        />
                    ) : (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            Awaiting equity data from engine
                        </div>
                    )}
                </HoloPanel>
            </motion.section>

            <div className={styles.divider} />

            {/* MONTHLY RETURNS — Live from API */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeInUp}
            >
                <span className={styles.sectionLabel}>MONTHLY RETURNS</span>
                <h2 className={styles.sectionTitle}>Return by month</h2>
                <HoloPanel size="lg" depth="foreground" className={styles.chartPanel}>
                    {monthlyData.length > 0 ? (
                        <MonthlyReturnsHeatmap data={monthlyData} />
                    ) : (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            Awaiting monthly return data from engine
                        </div>
                    )}
                </HoloPanel>
            </motion.section>

            <div className={styles.divider} />

            {/* KEY METRICS — Live from API */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>KEY METRICS</span>
                <h2 className={styles.sectionTitle}>Fund performance indicators</h2>

                <div className={styles.metricsGrid}>
                    {METRICS_DISPLAY.map((m) => (
                        <motion.div key={m.key} variants={staggerItem}>
                            <HoloPanel size="sm" depth="mid" className={styles.metricCard}>
                                <div
                                    className={`${styles.metricValue} ${m.key === 'maxDrawdown'
                                            ? styles.metricValueNegative
                                            : m.key === 'sharpeRatio' || m.key === 'sortinoRatio' || m.key === 'calmarRatio'
                                                ? styles.metricValueNeutral
                                                : styles.metricValuePositive
                                        }`}
                                >
                                    {m.value !== null ? (
                                        <>
                                            {m.value > 0 && m.key !== 'sharpeRatio' && m.key !== 'sortinoRatio' && m.key !== 'calmarRatio' && m.key !== 'winRate' ? '+' : ''}
                                            {m.value.toFixed(m.suffix === '%' ? 1 : 2)}
                                            {m.suffix}
                                        </>
                                    ) : '—'}
                                </div>
                                <div className={styles.metricLabel}>{m.label}</div>
                            </HoloPanel>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* RISK SUMMARY — Live from API */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>RISK SUMMARY</span>
                <h2 className={styles.sectionTitle}>Current risk posture</h2>

                <div className={styles.riskGrid}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.riskCard}>
                            <span className={styles.riskLabel}>MARKET REGIME</span>
                            <span className={`${styles.regimeBadge} ${regimeClass(risk.regime)}`}>
                                {risk.regime}
                            </span>
                        </HoloPanel>
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.riskCard}>
                            <span className={styles.riskLabel}>DRAWDOWN FROM PEAK</span>
                            <span className={`${styles.riskValue} ${styles.metricValueNegative}`}>
                                {risk.drawdownFromPeak}%
                            </span>
                        </HoloPanel>
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.riskCard}>
                            <span className={styles.riskLabel}>ACTIVE MODELS</span>
                            <span className={`${styles.riskValue} ${styles.metricValueNeutral}`}>
                                {risk.activeStrategies}
                            </span>
                        </HoloPanel>
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.riskCard}>
                            <span className={styles.riskLabel}>RISK LEVEL</span>
                            <div className={styles.gaugeWrap}>
                                <HoloGauge
                                    value={riskLevelToGauge(risk.riskLevel)}
                                    label={risk.riskLevel}
                                    size={100}
                                    thickness={5}
                                />
                            </div>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* DISCLAIMER */}
            <motion.section
                className={styles.disclaimer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
            >
                <div className={styles.disclaimerIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                </div>
                <p className={styles.disclaimerText}>
                    Past performance does not guarantee future results. All returns shown are aggregate fund performance
                    and do not represent individual position results. Investing involves risk,
                    including the potential loss of principal. Please review our risk disclosure before depositing.
                </p>
            </motion.section>

            {/* CTA */}
            <section className={styles.ctaSection}>
                <Link href="/register" className={styles.ctaButton}>
                    START INVESTING
                </Link>
            </section>
        </PageContainer>
    );
}
