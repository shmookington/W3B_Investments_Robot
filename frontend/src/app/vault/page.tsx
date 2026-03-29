'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel, HoloMetric } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import {
    filterByTimeRange,
    normalizeToPercent,
    type EquityDataPoint,
    type TimeRange,
} from '@/lib/mockPerformanceData';
import styles from './page.module.css';

const FEE_STRUCTURE = [
    { label: 'DEPOSIT FEE', value: '0%', desc: 'No cost to deposit' },
    { label: 'WITHDRAWAL FEE', value: '0%', desc: 'No cost to withdraw' },
    { label: 'MANAGEMENT FEE', value: '0%', desc: 'No management fee' },
    { label: 'PERFORMANCE FEE', value: '20%', desc: 'On profits above high-water mark' },
] as const;

export default function VaultPage() {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [timeRange, setTimeRange] = useState<TimeRange>('90D');

    /* ─── Live vault stats from API ─── */
    const [nav, setNav] = useState<number | null>(null);
    const [totalReturn, setTotalReturn] = useState<number | null>(null);
    const [participants, setParticipants] = useState<number | null>(null);
    const [annualReturn, setAnnualReturn] = useState<number>(0);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(false);
    const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        async function fetchVaultData() {
            try {
                const res = await fetch('/api/vault/stats');
                if (res.ok) {
                    const json = await res.json();
                    const d = json.data ?? json;
                    setNav(d.tvl ?? d.nav ?? null);
                    setTotalReturn(d.totalReturnPct ?? d.totalReturn ?? d.apy ?? null);
                    setParticipants(d.depositorCount ?? d.participants ?? null);
                    setAnnualReturn((d.apy ?? d.annualReturn ?? 0) / 100);
                }
            } catch {
                // API unavailable
            }
            try {
                const res = await fetch('/api/portfolio/summary');
                if (res.ok) {
                    const json = await res.json();
                    const d = json.data ?? json;
                    setUserBalance(d.userBalance ?? d.balance ?? d.totalDeposited ?? 0);
                }
            } catch {
                // API unavailable
            }
            setLoading(false);
        }
        fetchVaultData();
    }, []);

    /* ─── Live equity curve from API ─── */
    const [equityRaw, setEquityRaw] = useState<EquityDataPoint[]>([]);

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
        }
        fetchEquity();
    }, []);

    const chartData = useMemo(() => {
        if (equityRaw.length < 2) return [];
        const filtered = filterByTimeRange(equityRaw, timeRange);
        return normalizeToPercent(filtered);
    }, [equityRaw, timeRange]);

    const depositNum = parseFloat(depositAmount) || 0;

    /* ─── Deposit handler ─── */
    const handleDeposit = async () => {
        if (depositNum <= 0) return;
        setTxLoading(true);
        setTxResult(null);
        try {
            const res = await fetch('/api/vault/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: depositNum }),
            });
            const json = await res.json();
            if (json.success || res.ok) {
                setTxResult({ success: true, message: `Successfully deposited $${depositNum.toLocaleString()}` });
                setDepositAmount('');
                setUserBalance(prev => prev + depositNum);
                setNav(prev => (prev ?? 0) + depositNum);
            } else {
                setTxResult({ success: false, message: json.error || 'Deposit failed' });
            }
        } catch {
            setTxResult({ success: false, message: 'Unable to connect to server' });
        } finally {
            setTxLoading(false);
        }
    };

    /* ─── Withdraw handler ─── */
    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount) || 0;
        if (amount <= 0) return;
        setTxLoading(true);
        setTxResult(null);
        try {
            const res = await fetch('/api/vault/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            const json = await res.json();
            if (json.success || res.ok) {
                setTxResult({ success: true, message: `Successfully withdrew $${amount.toLocaleString()}` });
                setWithdrawAmount('');
                setUserBalance(prev => Math.max(0, prev - amount));
                setNav(prev => Math.max(0, (prev ?? 0) - amount));
            } else {
                setTxResult({ success: false, message: json.error || 'Withdrawal failed' });
            }
        } catch {
            setTxResult({ success: false, message: 'Unable to connect to server' });
        } finally {
            setTxLoading(false);
        }
    };

    return (
        <PageContainer>
            {/* ═══════════════════════════════════════════
          PAGE HEADER
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.pageHeader}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <HoloLabel>THE VAULT</HoloLabel>
                <h1 className={styles.pageTitle}>Fund Vault</h1>
                <p className={styles.pageSubtitle}>
                    Invest in the fund. Our quantitative models generate returns through CFTC-regulated prediction markets. Withdraw anytime.
                </p>
            </motion.section>

            {/* ═══════════════════════════════════════════
          VAULT OVERVIEW — NAV, Return, Participants (LIVE)
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
            >
                <div className={styles.overviewGrid}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="foreground" glow="cyan">
                            <StatCounter
                                label="FUND NAV"
                                value={nav ?? 0}
                                prefix="$"
                                decimals={2}
                            />
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="foreground" glow="green">
                            <StatCounter
                                label="TOTAL RETURN"
                                value={totalReturn ?? 0}
                                suffix="%"
                                decimals={1}
                            />
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="foreground">
                            <StatCounter
                                label="FUND PARTICIPANTS"
                                value={participants ?? 0}
                            />
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            {/* ═══════════════════════════════════════════
          FEE STRUCTURE
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>FEE STRUCTURE</span>
                <h2 className={styles.sectionTitle}>Transparent, competitive fees</h2>

                <div className={styles.feeGrid}>
                    {FEE_STRUCTURE.map((fee) => (
                        <motion.div key={fee.label} variants={staggerItem}>
                            <HoloPanel size="sm" depth="mid" className={styles.feeCard}>
                                <div className={styles.feeValue}>{fee.value}</div>
                                <div className={styles.feeLabel}>{fee.label}</div>
                                <div className={styles.feeDesc}>{fee.desc}</div>
                            </HoloPanel>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          HOW IT WORKS — Step-by-step
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>HOW IT WORKS</span>
                <h2 className={styles.sectionTitle}>Fund investment in three steps</h2>

                <div className={styles.stepsRow}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.stepCard}>
                            <div className={styles.stepNumber}>01</div>
                            <div className={styles.stepTitle}>CREATE ACCOUNT</div>
                            <div className={styles.stepDesc}>
                                Create your fund account and complete verification. Register with your email.
                            </div>
                        </HoloPanel>
                    </motion.div>
                    <div className={styles.stepArrow}>→</div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.stepCard}>
                            <div className={styles.stepNumber}>02</div>
                            <div className={styles.stepTitle}>FUND YOUR ACCOUNT</div>
                            <div className={styles.stepDesc}>
                                Deposit capital into the fund vault. Review the fee structure and acknowledge risk disclosures.
                            </div>
                        </HoloPanel>
                    </motion.div>
                    <div className={styles.stepArrow}>→</div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.stepCard}>
                            <div className={styles.stepNumber}>03</div>
                            <div className={styles.stepTitle}>EARN & WITHDRAW</div>
                            <div className={styles.stepDesc}>
                                Your capital generates returns via our quantitative models. Withdraw anytime — no lock-ups, no penalties.
                            </div>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          DEPOSIT / WITHDRAW — LIVE API CALLS
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeInUp}
            >
                <span className={styles.sectionLabel}>YOUR VAULT</span>
                <h2 className={styles.sectionTitle}>Deposit or withdraw</h2>

                {/* Transaction result toast */}
                {txResult && (
                    <div style={{
                        padding: '12px 20px',
                        marginBottom: '16px',
                        borderRadius: '4px',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '12px',
                        background: txResult.success ? 'rgba(0,255,65,0.1)' : 'rgba(255,68,68,0.1)',
                        border: `1px solid ${txResult.success ? 'rgba(0,255,65,0.3)' : 'rgba(255,68,68,0.3)'}`,
                        color: txResult.success ? '#00ff41' : '#ff4444',
                    }}>
                        {txResult.success ? '✓' : '✗'} {txResult.message}
                    </div>
                )}

                <div className={styles.tabBar}>
                    <button
                        className={`${styles.tab} ${activeTab === 'deposit' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('deposit')}
                    >
                        DEPOSIT
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'withdraw' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        WITHDRAW
                    </button>
                </div>

                {activeTab === 'deposit' ? (
                    <HoloPanel size="md" depth="foreground">
                        <div className={styles.inputGroup}>
                            <HoloLabel>AMOUNT (USD)</HoloLabel>
                            <div className={styles.inputRow}>
                                <input
                                    type="number"
                                    className={styles.amountInput}
                                    placeholder="0.00"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    disabled={txLoading}
                                />
                                <button className={styles.maxBtn} onClick={() => setDepositAmount(String(userBalance))} disabled={txLoading}>MAX</button>
                            </div>
                        </div>

                        <div className={styles.projection}>
                            <HoloLabel>PROJECTED RETURNS</HoloLabel>
                            <div className={styles.projGrid}>
                                <div className={styles.projItem}>
                                    <span className={styles.projLabel}>DAILY</span>
                                    <span className={styles.projValue}>${(depositNum * annualReturn / 365).toFixed(2)}</span>
                                </div>
                                <div className={styles.projItem}>
                                    <span className={styles.projLabel}>WEEKLY</span>
                                    <span className={styles.projValue}>${(depositNum * annualReturn / 52).toFixed(2)}</span>
                                </div>
                                <div className={styles.projItem}>
                                    <span className={styles.projLabel}>MONTHLY</span>
                                    <span className={styles.projValue}>${(depositNum * annualReturn / 12).toFixed(2)}</span>
                                </div>
                                <div className={styles.projItem}>
                                    <span className={styles.projLabel}>YEARLY</span>
                                    <span className={styles.projValue}>${(depositNum * annualReturn).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className={styles.txButton}
                            onClick={handleDeposit}
                            disabled={depositNum <= 0 || txLoading}
                        >
                            {txLoading ? 'PROCESSING…' : depositNum > 0 ? `DEPOSIT $${depositNum.toLocaleString()}` : 'ENTER AMOUNT'}
                        </button>
                    </HoloPanel>
                ) : (
                    <HoloPanel size="md" depth="foreground">
                        <div className={styles.inputGroup}>
                            <HoloLabel>WITHDRAW AMOUNT (USD)</HoloLabel>
                            <div className={styles.inputRow}>
                                <input
                                    type="number"
                                    className={styles.amountInput}
                                    placeholder="0.00"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    disabled={txLoading}
                                />
                                <button className={styles.maxBtn} onClick={() => setWithdrawAmount(String(userBalance))} disabled={txLoading}>MAX</button>
                            </div>
                        </div>

                        <div className={styles.withdrawPreview}>
                            <div className={styles.previewRow}>
                                <span className={styles.previewLabel}>YOUR BALANCE</span>
                                <span className={styles.previewValue}>${userBalance.toLocaleString()}</span>
                            </div>
                            <div className={styles.previewRow}>
                                <span className={styles.previewLabel}>YOU RECEIVE</span>
                                <span className={styles.previewValue}>
                                    {parseFloat(withdrawAmount) > 0 ? `$${parseFloat(withdrawAmount).toLocaleString()}` : '—'}
                                </span>
                            </div>
                            <div className={styles.previewRow}>
                                <span className={styles.previewLabel}>FEE</span>
                                <span className={styles.previewValue}>$0.00</span>
                            </div>
                        </div>

                        <button
                            className={styles.txButton}
                            onClick={handleWithdraw}
                            disabled={(parseFloat(withdrawAmount) || 0) <= 0 || txLoading}
                        >
                            {txLoading ? 'PROCESSING…' : (parseFloat(withdrawAmount) || 0) > 0 ? `WITHDRAW $${parseFloat(withdrawAmount).toLocaleString()}` : 'ENTER AMOUNT'}
                        </button>
                    </HoloPanel>
                )}
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          HISTORICAL VAULT PERFORMANCE — LIVE API
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeInUp}
            >
                <span className={styles.sectionLabel}>FUND PERFORMANCE</span>
                <h2 className={styles.sectionTitle}>Historical fund NAV</h2>

                <HoloPanel size="lg" depth="foreground" className={styles.chartPanel}>
                    {chartData.length >= 2 ? (
                        <EquityCurveChart
                            data={chartData}
                            activeRange={timeRange}
                            onRangeChange={setTimeRange}
                            height={300}
                        />
                    ) : (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            {loading ? 'LOADING FUND DATA…' : 'Awaiting fund performance data from engine'}
                        </div>
                    )}
                </HoloPanel>

                <p className={styles.chartNote}>
                    Aggregate fund performance. No individual position details are disclosed to protect competitive advantage.
                </p>
            </motion.section>

            {/* ═══════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════ */}
            <section className={styles.ctaSection}>
                <Link href="/performance" className={styles.ctaSecondary}>VIEW FULL PERFORMANCE →</Link>
            </section>
        </PageContainer>
    );
}
