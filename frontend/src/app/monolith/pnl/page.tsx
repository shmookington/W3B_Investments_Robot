'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HolographicGrid } from '@/components/HolographicGrid';
import styles from './page.module.css';

interface PnLSummary {
    total_wagered: number;
    total_won: number;
    total_lost: number;
    net_pnl: number;
    roi_pct: number;
    win_rate_pct: number;
    record: string;
    kalshi_bets: number;
    manual_bets: number;
}

interface SportPnl {
    pnl_usd: number;
    wins: number;
    losses: number;
    wagered: number;
    roi_pct: number;
    record: string;
    win_rate_pct: number;
}

interface HistoryBet {
    id: string;
    source: string;
    event: string;
    sport: string;
    selection: string;
    stake: number;
    odds: number;
    status: string;
    pnl: number;
    date: string;
}

interface ActivePosition {
    ticker: string;
    position: number;
    total_traded: number;
    realized_pnl: number;
    created_time?: string;
}

export default function PnLPage() {
    const [summary, setSummary] = useState<PnLSummary | null>(null);
    const [bySport, setBySport] = useState<Record<string, SportPnl>>({});
    const [history, setHistory] = useState<HistoryBet[]>([]);
    const [activePositions, setActivePositions] = useState<ActivePosition[]>([]);
    const [todayPnl, setTodayPnl] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [syncTime, setSyncTime] = useState<string>('');
    const [showLogger, setShowLogger] = useState(false);
    
    // Form state
    const [logEvent, setLogEvent] = useState('');
    const [logSport, setLogSport] = useState('NBA');
    const [logSelection, setLogSelection] = useState('HOME ML');
    const [logStake, setLogStake] = useState('100');
    const [logOdds, setLogOdds] = useState('50');
    const [logSubmitting, setLogSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [sumRes, sportRes, histRes, todayRes, posRes] = await Promise.all([
                fetch('/api/engine/proxy?endpoint=api/pnl/summary'),
                fetch('/api/engine/proxy?endpoint=api/pnl/by-sport'),
                fetch('/api/engine/proxy?endpoint=api/pnl/history'),
                fetch('/api/engine/proxy?endpoint=api/pnl/today'),
                fetch('/api/engine/proxy?endpoint=api/account/positions')
            ]);
            
            const sumData = await sumRes.json();
            const sportData = await sportRes.json();
            const histData = await histRes.json();
            const todayData = await todayRes.json();
            const posData = await posRes.json();
            
            if (sumData && sumData.summary) setSummary(sumData.summary);
            if (sportData && sportData.by_sport) setBySport(sportData.by_sport);
            if (histData && Array.isArray(histData.history)) setHistory(histData.history);
            if (todayData && todayData.today_pnl !== undefined) setTodayPnl(todayData.today_pnl);
            if (Array.isArray(posData)) setActivePositions(posData);
            else if (posData && Array.isArray(posData.market_positions)) setActivePositions(posData.market_positions);
            else if (posData && Array.isArray(posData.positions)) setActivePositions(posData.positions);
            
            setSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error("PnL sync failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    const handleLogBet = async (e: React.FormEvent) => {
        e.preventDefault();
        setLogSubmitting(true);
        try {
            await fetch('/api/engine/proxy?endpoint=api/bet/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: logEvent,
                    sport: logSport,
                    selection: logSelection,
                    stake: parseFloat(logStake),
                    odds: parseFloat(logOdds)
                })
            });
            setShowLogger(false);
            setLogEvent('');
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setLogSubmitting(false);
        }
    };

    if (loading) return <div className={styles.loading}>AGGREGATING P&L LEDGERS...</div>;

    const renderSummaryCard = (label: string, value: string | React.ReactNode, isMonetary: boolean = false, highlight: boolean = false) => {
        let valueClass = styles.metricValue;
        if (highlight && typeof value === 'string') {
            const num = parseFloat(value.replace(/[^0-9.-]+/g,""));
            if (num > 0) valueClass += ` ${styles.positive}`;
            if (num < 0) valueClass += ` ${styles.negative}`;
        }
        
        const strVal = value != null ? value.toString() : '';

        return (
            <div className={styles.metricCard}>
                <div className={styles.metricLabel}>{label}</div>
                <div className={valueClass}>
                    {isMonetary && strVal.includes('-') ? '-' : ''}
                    {isMonetary ? '$' : ''}
                    {strVal.replace('-', '')}
                </div>
            </div>
        );
    };

    return (
        <>
            <HolographicGrid />
            <div className={styles.container}>
                <Link href="/monolith/terminal" className={styles.backBtn}>← TERMINAL</Link>
                
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <span style={{ fontSize: '2.5rem' }}>📊</span> PORTFOLIO ANALYTICS
                    </h1>
                    <div className={styles.syncStatus}>
                        <div><span className={styles.liveDot}>●</span>KALSHI LINK ACTIVE</div>
                        <div>LAST SYNC: {syncTime}</div>
                    </div>
                </div>

                {summary && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>AGGREGATE PERFORMANCE</h2>
                        <div className={styles.summaryGrid}>
                            {renderSummaryCard("NET P&L", summary.net_pnl.toFixed(2), true, true)}
                            {renderSummaryCard("TOTAL WAGERED", summary.total_wagered.toFixed(2), true)}
                            {renderSummaryCard("ROI", `${summary.roi_pct.toFixed(2)}%`, false, true)}
                            {renderSummaryCard("WIN RATE", `${summary.win_rate_pct.toFixed(1)}%`)}
                            {renderSummaryCard("TODAY'S RETURN", todayPnl.toFixed(2), true, true)}
                            {renderSummaryCard("OVERALL RECORD", summary.record)}
                            {renderSummaryCard("LIVE KALSHI BETS", summary.kalshi_bets.toString())}
                            {renderSummaryCard("MANUAL PAPER BETS", summary.manual_bets.toString())}
                        </div>
                    </div>
                )}

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>P&L BY SPORT</h2>
                    <div className={styles.sportGrid}>
                        {Object.keys(bySport).map(sport => {
                            const data = bySport[sport];
                            return (
                                <div key={sport} className={styles.sportCard}>
                                    <div className={styles.sportHeader}>
                                        <div className={styles.sportName}>{sport === 'unknown' ? 'OTHER' : sport}</div>
                                        <div className={data.pnl_usd >= 0 ? styles.positive : styles.negative}>
                                            ${Math.abs(data.pnl_usd).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className={styles.sportStats}>
                                        <span style={{ opacity: 0.7 }}>WIN RATE</span>
                                        <span>{data.win_rate_pct.toFixed(1)}%</span>
                                    </div>
                                    <div className={styles.sportStats}>
                                        <span style={{ opacity: 0.7 }}>ROI</span>
                                        <span className={data.roi_pct >= 0 ? styles.positive : styles.negative}>
                                            {data.roi_pct > 0 ? '+' : ''}{data.roi_pct.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className={styles.sportStats}>
                                        <span style={{ opacity: 0.7 }}>WAGERED</span>
                                        <span>${data.wagered.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.sportStats}>
                                        <span style={{ opacity: 0.7 }}>RECORD</span>
                                        <span>{data.record}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className={styles.sectionTitle}>ACTIVE KALSHI POSITIONS</h2>
                        <button className={styles.backBtn} onClick={() => setShowLogger(true)}>+ LOG MANUAL BET</button>
                    </div>
                    {activePositions.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, border: '1px solid var(--crt-dim)' }}>NO ACTIVE POSITIONS FOUND ON EXCHANGE.</div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.historyTable}>
                                <thead>
                                    <tr>
                                        <th>Ticker</th>
                                        <th>Direction</th>
                                        <th>Total Traded</th>
                                        <th>Realized PnL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activePositions.map((p, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 'bold', color: 'var(--crt-glow)' }}>{p.ticker}</td>
                                            <td className={p.position > 0 ? styles.statusWon : styles.statusLost}>{p.position > 0 ? 'YES' : 'NO'}</td>
                                            <td>{p.total_traded} contracts</td>
                                            <td className={p.realized_pnl > 0 ? styles.positive : (p.realized_pnl < 0 ? styles.negative : '')}>
                                                {p.realized_pnl === 0 ? '-' : (p.realized_pnl > 0 ? '+' : '') + `$${(p.realized_pnl / 100).toFixed(2)}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>RESOLVED TICKER HISTORY</h2>
                    {history.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>NO SETTLED BETS DETECTED.</div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.historyTable}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Source</th>
                                        <th>Sport</th>
                                        <th>Event / Ticker</th>
                                        <th>Selection</th>
                                        <th>Stake</th>
                                        <th>Net P&L</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(bet => {
                                        let dStr = bet.date;
                                        try {
                                            const d = new Date(bet.date);
                                            dStr = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                        } catch (e) {}
                                        
                                        return (
                                        <tr key={bet.id}>
                                            <td style={{ opacity: 0.8 }}>{dStr}</td>
                                            <td style={{ textTransform: 'uppercase' }}>{bet.source}</td>
                                            <td style={{ textTransform: 'uppercase' }}>{bet.sport}</td>
                                            <td style={{ fontWeight: 'bold' }}>{bet.event}</td>
                                            <td>{bet.selection}</td>
                                            <td>${bet.stake.toFixed(2)}</td>
                                            <td className={bet.pnl > 0 ? styles.positive : (bet.pnl < 0 ? styles.negative : '')}>
                                                {bet.pnl > 0 ? '+' : ''}{bet.pnl === 0 ? '-' : `$${Math.abs(bet.pnl).toFixed(2)}`}
                                            </td>
                                            <td className={bet.status === 'won' ? styles.statusWon : (bet.status === 'lost' ? styles.statusLost : styles.statusPending)}>
                                                {bet.status.toUpperCase()}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
            
            {showLogger && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.sectionTitle}>LOG PAPER BET</h2>
                        <form onSubmit={handleLogBet}>
                            <div className={styles.inputGroup}>
                                <label>EVENT NAME</label>
                                <input required value={logEvent} onChange={e => setLogEvent(e.target.value)} placeholder="e.g. Lakers vs Celtics" />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>SPORT</label>
                                <select value={logSport} onChange={e => setLogSport(e.target.value)}>
                                    <option value="NBA">NBA</option>
                                    <option value="NFL">NFL</option>
                                    <option value="CFB">College Football</option>
                                    <option value="Soccer">Soccer</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>SELECTION</label>
                                <input required value={logSelection} onChange={e => setLogSelection(e.target.value)} placeholder="e.g. HOME ML" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className={styles.inputGroup}>
                                    <label>STAKE (USD)</label>
                                    <input required type="number" step="1" value={logStake} onChange={e => setLogStake(e.target.value)} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>IMPLIED ODDS %</label>
                                    <input required type="number" step="0.1" value={logOdds} onChange={e => setLogOdds(e.target.value)} />
                                </div>
                            </div>
                            <div className={styles.modalBtns}>
                                <button type="button" className={styles.actionBtn} style={{ color: '#ccc', borderColor: '#ccc' }} onClick={() => setShowLogger(false)}>CANCEL</button>
                                <button type="submit" className={styles.actionBtn} disabled={logSubmitting}>{logSubmitting ? 'LOGGING...' : 'SAVE TO TRACKER'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
