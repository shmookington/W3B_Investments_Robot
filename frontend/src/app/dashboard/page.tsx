'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { OnboardingModal, useOnboarding } from '@/components/OnboardingModal';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import {
    filterByTimeRange,
    normalizeToPercent,
    type EquityDataPoint,
    type TimeRange,
} from '@/lib/mockPerformanceData';
import styles from './page.module.css';

/* ─── Fund stats type from API ─── */
interface VaultStats {
    tvl: number;
    totalDeposited: number;
    totalWithdrawn: number;
    apy: number;
    depositorCount: number;
    totalPnl: number;
    totalFees: number;
    tradeCount: number;
    closedTradeCount: number;
    winRate: number;
    sharePrice: number;
    reserveRatio: number;
    vaultStatus: string;
    tvlHistory: { date: string; tvl: number }[];
}

/* ─── Status types ─── */
type SystemStatus = 'operational' | 'maintenance' | 'paused';

const STATUS_CONFIG = {
    operational: { label: 'ALL SYSTEMS OPERATIONAL', color: '#00ff41', dot: styles.dotGreen },
    maintenance: { label: 'MAINTENANCE WINDOW', color: '#ffb300', dot: styles.dotAmber },
    paused: { label: 'TEMPORARILY PAUSED', color: '#ff3b3b', dot: styles.dotRed },
} as const;

export default function Dashboard() {
    const { user } = useAuth();
    const isConnected = !!user;
    const [timeRange, setTimeRange] = useState<TimeRange>('90D');
    const { show: showOnboarding, setShow: setShowOnboarding } = useOnboarding();

    // ─── Live vault stats from API ───
    const [stats, setStats] = useState<VaultStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/vault/stats');
                const json = await res.json();
                if (json.success) setStats(json.data);
            } catch (err) {
                console.error('Failed to fetch vault stats:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
        // Refresh every 60s
        const interval = setInterval(fetchStats, 60_000);
        return () => clearInterval(interval);
    }, []);

    // ─── Derived values from live data ───
    const tvl = stats?.tvl ?? 0;
    const totalPnl = stats?.totalPnl ?? 0;
    const pnlPct = tvl > 0 ? (totalPnl / tvl) * 100 : 0;
    const apy = stats?.apy ?? 0;
    const winRate = stats?.winRate ?? 0;
    const sharePrice = stats?.sharePrice ?? 1.0;
    const tradeCount = stats?.tradeCount ?? 0;
    const depositorCount = stats?.depositorCount ?? 0;

    // ─── Fund return windows — computed from annualized return if no snapshot history ───
    const vaultReturns = useMemo(() => {
        const dailyRate = apy / 365;
        return [
            { label: '24H', value: apy !== 0 ? `${dailyRate >= 0 ? '+' : ''}${dailyRate.toFixed(3)}%` : '—' },
            { label: '7D', value: apy !== 0 ? `${(dailyRate * 7) >= 0 ? '+' : ''}${(dailyRate * 7).toFixed(2)}%` : '—' },
            { label: '30D', value: apy !== 0 ? `${(dailyRate * 30) >= 0 ? '+' : ''}${(dailyRate * 30).toFixed(2)}%` : '—' },
            { label: 'YTD', value: apy !== 0 ? `${apy >= 0 ? '+' : ''}${apy.toFixed(1)}%` : '—' },
        ];
    }, [apy]);

    // ─── Equity curve from NAV history ───
    const chartData = useMemo(() => {
        if (!stats?.tvlHistory?.length) return [];
        const equityData: EquityDataPoint[] = stats.tvlHistory.map(p => ({
            date: p.date,
            equity: p.tvl,
            btc: 0,
            eth: 0,
            sp500: 0,
        }));
        if (equityData.length < 2) return [];
        const filtered = filterByTimeRange(equityData, timeRange);
        return normalizeToPercent(filtered);
    }, [stats, timeRange]);

    // ─── System status derived from engine health ───
    const systemStatus: SystemStatus = stats?.vaultStatus === 'operational' ? 'operational'
        : stats?.vaultStatus === 'paused' ? 'paused'
            : 'maintenance';
    const status = STATUS_CONFIG[systemStatus];

    const displayName = user?.email ?? 'Fund Member';

    /* ─── If not connected, show connect prompt ─── */
    if (!isConnected) {
        return (
            <PageContainer>
                <motion.section className={styles.connectScreen} initial="hidden" animate="visible" variants={fadeInUp}>
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1.2">
                        <rect x="10" y="24" width="36" height="26" rx="4" />
                        <path d="M18 24V16a10 10 0 0 1 20 0v8" />
                        <circle cx="28" cy="38" r="4" fill="rgba(0, 240, 255, 0.2)" />
                    </svg>
                    <h1 className={styles.connectTitle}>DASHBOARD</h1>
                    <p className={styles.connectDesc}>Log in to view your fund position, track returns, and manage your account.</p>
                </motion.section>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Onboarding Modal — shows on first visit */}
            <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

            {/* ═══════════════════════════════════════════
          ACCOUNT HEADER + SYSTEM STATUS
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.header}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <div className={styles.headerLeft}>
                    <HoloLabel>DASHBOARD</HoloLabel>
                    <span className={styles.walletAddr}>{displayName}</span>
                </div>
                <div className={styles.statusPill}>
                    <div className={`${styles.statusDot} ${status.dot}`} />
                    <span className={styles.statusLabel} style={{ color: status.color }}>
                        {loading ? 'LOADING...' : status.label}
                    </span>
                </div>
            </motion.section>

            {/* ═══════════════════════════════════════════
          VAULT OVERVIEW — TVL, Trades, P&L
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>FUND OVERVIEW</span>

                <div className={styles.portfolioGrid}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="foreground" glow="cyan">
                            <StatCounter
                                label="FUND NAV"
                                value={tvl}
                                prefix="$"
                                decimals={0}
                            />
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="foreground" glow="green">
                            <StatCounter
                                label="TOTAL POSITIONS"
                                value={tradeCount}
                                decimals={0}
                            />
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="foreground" className={styles.pnlCard}>
                            <div className={styles.pnlValue}>
                                {totalPnl >= 0 ? '+' : ''}{totalPnl === 0 ? '$0' : `$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            </div>
                            <div className={styles.pnlPct}>
                                {pnlPct === 0 ? '0.0' : (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(1)}%
                            </div>
                            <div className={styles.pnlLabel}>REALIZED P&L</div>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            {/* ─── Equity Curve (TVL history) ─── */}
            {chartData.length > 1 && (
                <motion.section
                    className={styles.section}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeInUp}
                >
                    <span className={styles.sectionLabel}>NAV HISTORY</span>
                    <HoloPanel size="lg" depth="foreground" className={styles.chartPanel}>
                        <EquityCurveChart
                            data={chartData}
                            activeRange={timeRange}
                            onRangeChange={setTimeRange}
                            height={280}
                        />
                    </HoloPanel>
                </motion.section>
            )}

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          VAULT PERFORMANCE — Live metrics
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>FUND PERFORMANCE</span>

                {/* Return windows */}
                <div className={styles.returnRow}>
                    {vaultReturns.map((r) => (
                        <motion.div key={r.label} variants={staggerItem}>
                            <HoloPanel size="sm" depth="mid" className={styles.returnCard}>
                                <div className={styles.returnValue}>{r.value}</div>
                                <div className={styles.returnLabel}>{r.label}</div>
                            </HoloPanel>
                        </motion.div>
                    ))}
                </div>

                {/* Win Rate, Depositors, APY */}
                <div className={styles.metricsRow}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.metricCard}>
                            <div className={styles.metricValue}>{winRate > 0 ? `${winRate.toFixed(1)}%` : '—'}</div>
                            <div className={styles.metricLabel}>WIN RATE</div>
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.metricCard}>
                            <div className={styles.metricValue}>{depositorCount}</div>
                            <div className={styles.metricLabel}>DEPOSITORS</div>
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.metricCard}>
                            <div className={`${styles.metricValue} ${apy > 0 ? styles.metricGreen : ''}`}>
                                {apy !== 0 ? `${apy.toFixed(1)}%` : '—'}
                            </div>
                            <div className={styles.metricLabel}>ANNUALIZED RETURN</div>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          QUICK ACTIONS
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeInUp}
            >
                <span className={styles.sectionLabel}>QUICK ACTIONS</span>

                <div className={styles.actionRow}>
                    <Link href="/vault" className={`${styles.actionBtn} ${styles.actionDeposit}`}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 4v12" />
                            <path d="M4 10h12" />
                        </svg>
                        DEPOSIT MORE
                    </Link>
                    <Link href="/vault" className={`${styles.actionBtn} ${styles.actionWithdraw}`}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 10h12" />
                        </svg>
                        WITHDRAW
                    </Link>
                    <Link href="/dashboard/history" className={`${styles.actionBtn} ${styles.actionHistory}`}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="10" cy="10" r="8" />
                            <path d="M10 6v4l3 3" />
                        </svg>
                        VIEW TX HISTORY
                    </Link>
                </div>
            </motion.section>
        </PageContainer>
    );
}
