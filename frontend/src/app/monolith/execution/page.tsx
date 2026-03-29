'use client';

import { useState, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Types ─────────────────────────────────────────────────── */
interface Trade {
    time?: string;
    asset?: string;
    side?: string;
    price?: number;
    quantity?: number;
    [key: string]: unknown;
}

/* ── Component ─────────────────────────────────────────────── */
export default function ExecutionEnginePage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=live/trades');
            if (res.ok) {
                const data = await res.json();
                setTrades(data.trades ?? []);
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
                    LOADING EXECUTION DATA…
                </div>
            </PageContainer>
        );
    }

    const hasTrades = trades.length > 0;
    const perPage = 10;
    const totalPages = Math.max(1, Math.ceil(trades.length / perPage));
    const visibleTrades = trades.slice(page * perPage, (page + 1) * perPage);

    return (
        <PageContainer>
            <MonolithNav />

            {/* 1. EXECUTION QUALITY — LIVE TRADE COUNT */}
            <section className={styles.quality}>
                <HoloLabel>EXECUTION ENGINE — LIVE</HoloLabel>
                <div className={styles.qualityGrid}>
                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter label="TOTAL TRADES" value={trades.length} decimals={0} />
                    </HoloPanel>
                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter label="BUY ORDERS" value={trades.filter(t => t.side?.toUpperCase() === 'BUY').length} decimals={0} />
                    </HoloPanel>
                    <HoloPanel size="sm" depth="foreground">
                        <StatCounter label="SELL ORDERS" value={trades.filter(t => t.side?.toUpperCase() === 'SELL').length} decimals={0} />
                    </HoloPanel>
                </div>
            </section>

            {/* 2. TRADE LOG (LIVE) */}
            <section className={styles.log}>
                <HoloPanel size="sm" depth="mid" header="TRADE LOG — LIVE">
                    {hasTrades ? (
                        <>
                            <table className={styles.logTable}>
                                <thead>
                                    <tr><th>TIME</th><th>ASSET</th><th>SIDE</th><th>PRICE</th><th>QTY</th></tr>
                                </thead>
                                <tbody>
                                    {visibleTrades.map((t, i) => (
                                        <tr key={i}>
                                            <td className={styles.timeCell}>{t.time ?? '—'}</td>
                                            <td>{t.asset ?? '—'}</td>
                                            <td className={t.side?.toUpperCase() === 'BUY' ? styles.sideBuy : styles.sideSell}>{t.side?.toUpperCase() ?? '—'}</td>
                                            <td>{t.price ?? '—'}</td>
                                            <td>{t.quantity ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div className={styles.logFooter}>
                                    <div className={styles.pagination}>
                                        <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(page - 1)}>← PREV</button>
                                        <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
                                        <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>NEXT →</button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
                            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>◈</div>
                            NO TRADES EXECUTED YET
                            <br /><br />
                            <span style={{ fontSize: '10px', color: 'rgba(224,224,232,0.15)' }}>
                                The engine is running but has not executed any trades yet.
                                <br />Trades will appear here in real-time as signals are generated and acted upon.
                            </span>
                        </div>
                    )}
                </HoloPanel>
            </section>

            {/* 3. SLIPPAGE TRACKER — AWAITING */}
            <section className={styles.slippage}>
                <HoloPanel size="md" depth="mid" header="SLIPPAGE TRACKER">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Slippage analysis will populate once trades are executed.
                        <br />Each trade will be measured: decision price vs execution price.
                    </div>
                </HoloPanel>
            </section>

            {/* 4. VENUE PERFORMANCE — AWAITING */}
            <section className={styles.venue}>
                <HoloPanel size="sm" depth="mid" header="VENUE PERFORMANCE">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Venue performance rankings will be calculated from actual trade execution data.
                        <br />Requires trade history across multiple venues.
                    </div>
                </HoloPanel>
            </section>

            {/* 5. ALPHA GATE — AWAITING */}
            <section className={styles.gate}>
                <HoloLabel>ALPHA GATE STATISTICS</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Alpha gate statistics (accepted/rejected trades, saved P&L)
                        <br />will populate as the engine processes trade signals through quality filters.
                    </div>
                </HoloPanel>
            </section>

            {/* 6. INTERNAL CROSSING — AWAITING */}
            <section className={styles.crossing}>
                <HoloLabel>INTERNAL CROSSING REPORT</HoloLabel>
                <HoloPanel size="sm" depth="mid">
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(224,224,232,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                        Internal crossing data will be available once multiple strategies
                        <br />are actively trading and generating offsetting orders.
                    </div>
                </HoloPanel>
            </section>
        </PageContainer>
    );
}
