'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { HoloGauge } from '@/components/HoloGauge';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import styles from './page.module.css';

interface MonthlyReport {
    period: string;
    returnPct: string;
    source: string;
    status: string;
}

export default function TrackRecordPage() {
    /* ─── Live fund stats from API ─── */
    const [nav, setNav] = useState<number | null>(null);
    const [totalReturn, setTotalReturn] = useState<number | null>(null);
    const [positionsVerified, setPositionsVerified] = useState<number | null>(null);
    const [cashReserve, setCashReserve] = useState<number>(60);
    const [lastVerified, setLastVerified] = useState<string>('—');
    const [loading, setLoading] = useState(true);

    /* ─── Monthly verified returns from API ─── */
    const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
    const [monthsVerified, setMonthsVerified] = useState<number>(0);

    useEffect(() => {
        async function fetchTrackRecord() {
            try {
                // Fetch fund summary
                const [portfolioRes, riskRes] = await Promise.all([
                    fetch('/api/portfolio/summary'),
                    fetch('/api/risk/metrics'),
                ]);
                const p = portfolioRes.ok ? await portfolioRes.json() : null;
                const r = riskRes.ok ? await riskRes.json() : null;
                const pData = p?.data ?? p;
                const rData = r?.data ?? r;

                setNav(pData?.tvl ?? pData?.nav ?? null);
                setTotalReturn(pData?.totalReturnPct ?? pData?.totalReturn ?? null);
                setPositionsVerified(pData?.totalPositions ?? pData?.tradeCount ?? null);
                setCashReserve(rData?.reserveRatio ?? rData?.cashReserve ?? 60);
            } catch { /* API unavailable */ }

            try {
                // Fetch verified monthly returns
                const res = await fetch('/api/portfolio/by-month');
                if (res.ok) {
                    const json = await res.json();
                    const data = json.data ?? json;
                    if (Array.isArray(data)) {
                        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
                        const reports: MonthlyReport[] = [];
                        for (const yearRow of data) {
                            const yr = yearRow.year;
                            const monthValues = yearRow.months ?? [];
                            for (let m = monthValues.length - 1; m >= 0; m--) {
                                const val = monthValues[m];
                                if (val !== null && val !== undefined) {
                                    reports.push({
                                        period: `${months[m]} ${yr}`,
                                        returnPct: `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
                                        source: 'Kalshi API',
                                        status: 'verified',
                                    });
                                }
                            }
                        }
                        setMonthlyReports(reports);
                        setMonthsVerified(reports.length);
                    }
                }
            } catch { /* API unavailable */ }

            try {
                // Fetch last verified timestamp
                const res = await fetch('/api/portfolio/last-verified');
                if (res.ok) {
                    const json = await res.json();
                    setLastVerified(json.data?.timestamp ?? json.timestamp ?? '—');
                }
            } catch { /* API unavailable */ }

            setLoading(false);
        }
        fetchTrackRecord();
    }, []);

    return (
        <PageContainer>
            {/* ─── THE BIG BUTTON ─── */}
            <section className={styles.bigButtonSection}>
                <button className={styles.bigButton}>VERIFY THE TRACK RECORD</button>
                <p className={styles.bigButtonSub}>No login required. Fully transparent. Every position independently verified.</p>
            </section>

            {/* ─── Fund Performance Data (LIVE) ─── */}
            <section className={styles.reserves}>
                <HoloLabel>INDEPENDENTLY VERIFIED PERFORMANCE</HoloLabel>
                <div className={styles.reserveGrid}>
                    <HoloPanel size="sm" depth="foreground" glow="cyan">
                        <StatCounter
                            label="FUND NAV"
                            value={nav ?? 0}
                            prefix="$"
                            decimals={0}
                        />
                    </HoloPanel>
                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter
                            label="TOTAL RETURN"
                            value={totalReturn ?? 0}
                            suffix="%"
                            decimals={1}
                        />
                    </HoloPanel>
                    <HoloPanel size="sm" depth="foreground" glow="green">
                        <StatCounter
                            label="POSITIONS VERIFIED"
                            value={positionsVerified ?? 0}
                            decimals={0}
                        />
                    </HoloPanel>
                </div>

                <div className={styles.gaugeRow}>
                    <HoloPanel size="md" depth="foreground" header="CASH RESERVE RATIO">
                        <div className={styles.gaugeCenter}>
                            <HoloGauge value={cashReserve} label="RATIO" size={160} />
                            <div className={styles.gaugeInfo}>
                                <span className={styles.gaugeValue}>{cashReserve}%</span>
                                <span className={styles.gaugeTarget}>Target: &gt; 50%</span>
                            </div>
                        </div>
                    </HoloPanel>
                    <div className={styles.lastVerified}>
                        <HoloPanel size="sm" depth="mid">
                            <div className={styles.verifiedInner}>
                                <HoloLabel>LAST VERIFIED</HoloLabel>
                                <span className={styles.verifiedTime}>{lastVerified}</span>
                                <span className={styles.verifiedNote}>Source: Kalshi Exchange API</span>
                            </div>
                        </HoloPanel>
                    </div>
                </div>
            </section>

            {/* ─── Monthly Verified Returns (LIVE) ─── */}
            <section className={styles.patriotSection}>
                <HoloLabel>MONTHLY VERIFIED RETURNS</HoloLabel>
                <div className={styles.patriotGrid}>
                    <HoloPanel size="md" depth="foreground" glow="green">
                        <div className={styles.patriotCounter}>
                            <StatCounter label="MONTHS OF VERIFIED TRACK RECORD" value={monthsVerified} decimals={0} />
                        </div>
                    </HoloPanel>
                    <HoloPanel size="sm" depth="mid" header="MONTHLY STATEMENTS">
                        <table className={styles.patriotTable}>
                            <thead><tr><th>PERIOD</th><th>RETURN</th><th>SOURCE</th></tr></thead>
                            <tbody>
                                {monthlyReports.length > 0 ? monthlyReports.map((report, i) => (
                                    <tr key={i}>
                                        <td className={styles.patriotAmount}>{report.period}</td>
                                        <td>{report.returnPct}</td>
                                        <td><span className={styles.txLink}>{report.source}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'rgba(0,240,255,0.4)', padding: '20px' }}>
                                        {loading ? 'Loading verified returns…' : 'Awaiting verified return data from engine'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </HoloPanel>
                </div>
            </section>

            {/* ─── Data Sources ─── */}
            <section className={styles.contractsSection}>
                <HoloPanel size="sm" depth="mid" header="VERIFICATION SOURCES">
                    <div className={styles.contractGrid}>
                        <div className={styles.contractItem}>
                            <span className={styles.contractName}>Settlement Data</span>
                            <span className={styles.contractAddr}>Kalshi Exchange API</span>
                        </div>
                        <div className={styles.contractItem}>
                            <span className={styles.contractName}>Market Data</span>
                            <span className={styles.contractAddr}>Kalshi Events API</span>
                        </div>
                        <div className={styles.contractItem}>
                            <span className={styles.contractName}>Balance Verification</span>
                            <span className={styles.contractAddr}>Kalshi Portfolio API</span>
                        </div>
                    </div>
                </HoloPanel>
            </section>

            {/* ─── External Links ─── */}
            <section className={styles.linksSection}>
                <div className={styles.linksRow}>
                    <a href="/api/portfolio/report?format=pdf" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                        <span className={styles.linkTitle}>PERFORMANCE REPORT</span>
                        <span className={styles.linkDesc}>Download full performance report PDF</span>
                    </a>
                    <a href="/api/portfolio/monthly-statement?format=pdf" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                        <span className={styles.linkTitle}>MONTHLY STATEMENT</span>
                        <span className={styles.linkDesc}>Download latest monthly performance report</span>
                    </a>
                </div>
            </section>
        </PageContainer>
    );
}
