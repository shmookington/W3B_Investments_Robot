'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import styles from './page.module.css';

interface LedgerEntry {
    exchange: string;
    balance: number;
    in_play: number;
    status: string;
    last_sync: string;
}

interface ChartData {
    time: string;
    gross: number;
    net: number;
    unrealized: number;
}

interface Attribution {
    category: string;
    sport: string;
    win_rate: string;
    net_pnl: number;
    roi: number;
}

export default function PnlTrackerPage() {
    const [activeChartMode, setActiveChartMode] = useState<'GROSS' | 'NET' | 'UNREALIZED'>('NET');
    const [chartData, setChartData] = useState<ChartData[]>([]);
    
    // Mock Data
    const ledger: LedgerEntry[] = [
        { exchange: 'Kalshi (Primary)', balance: 84250.00, in_play: 12500.00, status: 'CONNECTED', last_sync: '1s ago' },
        { exchange: 'DraftKings (Hedge)', balance: 14200.00, in_play: 800.00, status: 'CONNECTED', last_sync: '4s ago' },
        { exchange: 'Treasury Reserve', balance: 185000.00, in_play: 0.00, status: 'LOCKED', last_sync: '10m ago' }
    ];

    const attributions: Attribution[] = [
        { category: 'Player Props (Points)', sport: 'NBA', win_rate: '58.4%', net_pnl: 14250.50, roi: 8.4 },
        { category: 'Point Spreads (2nd Q)', sport: 'NBA', win_rate: '54.2%', net_pnl: 8150.25, roi: 4.2 },
        { category: 'Moneyline Underdogs', sport: 'SOCCER', win_rate: '28.1%', net_pnl: 3420.00, roi: 12.1 },
        { category: 'Point Totals (O/U)', sport: 'NFL', win_rate: '49.2%', net_pnl: -1150.00, roi: -1.1 },
    ];

    // Generate minute-by-minute mock yield curve data
    useEffect(() => {
        const data: ChartData[] = [];
        let baseGross = 150000;
        let baseNet = 145000;
        let baseUnrealized = 5000;
        const now = new Date();
        
        for (let i = 60; i >= 0; i--) {
            const timeDate = new Date(now.getTime() - i * 60000);
            const timeStr = `${timeDate.getHours().toString().padStart(2, '0')}:${timeDate.getMinutes().toString().padStart(2, '0')}`;
            
            // Random walk
            baseGross += (Math.random() - 0.45) * 500;
            baseNet += (Math.random() - 0.45) * 480;
            baseUnrealized += (Math.random() - 0.5) * 800;
            
            data.push({
                time: timeStr,
                gross: Math.round(baseGross),
                net: Math.round(baseNet),
                unrealized: Math.round(baseUnrealized)
            });
        }
        setChartData(data);
    }, []);

    const dataKey = activeChartMode === 'GROSS' ? 'gross' : activeChartMode === 'NET' ? 'net' : 'unrealized';
    const chartColor = activeChartMode === 'GROSS' ? '#ffb800' : activeChartMode === 'NET' ? '#39ff14' : '#00f0ff';

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>RAW P&L TRACKER</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. Multi-Exchange Ledger */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>MULTI-EXCHANGE LEDGER</h2>
                        <span className={styles.headerTag}>LIQUIDITY STATUS</span>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.ledgerTable}>
                            <thead>
                                <tr>
                                    <th>EXCHANGE / REPOSITORY</th>
                                    <th>AVAILABLE BALANCE</th>
                                    <th>CAPITAL IN-PLAY</th>
                                    <th>TOTAL EXPOSURE</th>
                                    <th>STATUS</th>
                                    <th>LAST SYNC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((entry, idx) => (
                                    <tr key={idx}>
                                        <td className={styles.highlightRow}>{entry.exchange}</td>
                                        <td className={styles.cashValue}>${entry.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className={styles.inPlayValue}>${entry.in_play.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className={styles.highlightRow}>${(entry.balance + entry.in_play).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td><span className={entry.status === 'CONNECTED' ? styles.statusOk : styles.statusLocked}>[{entry.status}]</span></td>
                                        <td className={styles.dimRow}>{entry.last_sync}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. High-Resolution Yield Curves */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>HIGH-RESOLUTION YIELD CURVE (1M TICK)</h2>
                        <div className={styles.toggles}>
                            {(['GROSS', 'NET', 'UNREALIZED'] as const).map(mode => (
                                <button 
                                    key={mode} 
                                    className={`${styles.toggleBtn} ${activeChartMode === mode ? styles.toggleActive : ''}`}
                                    onClick={() => setActiveChartMode(mode)}
                                >
                                    {mode} P&L
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,244,245,0.05)" vertical={false} />
                                <XAxis 
                                    dataKey="time" 
                                    tick={{ fill: 'rgba(244,244,245,0.4)', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    tick={{ fill: 'rgba(244,244,245,0.4)', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickFormatter={(value) => `$${(value/1000).toFixed(1)}k`}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(10, 10, 12, 0.95)', border: `1px solid ${chartColor}`, fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number | undefined) => [`$${value?.toLocaleString() || '0'}`, `${activeChartMode} P&L`]}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey={dataKey} 
                                    stroke={chartColor} 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorYield)" 
                                    isAnimationActive={true}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Attribution Analysis */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>ATTRIBUTION ANALYSIS (PNL ISOLATION)</h2>
                        <span className={styles.headerTag}>WHERE IS THE ALPHA?</span>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.ledgerTable}>
                            <thead>
                                <tr>
                                    <th>VECTOR / CATEGORY</th>
                                    <th>SPORT</th>
                                    <th>WIN RATE</th>
                                    <th>NET YIELD (USD)</th>
                                    <th>ATTRIBUTED ROI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attributions.map((attr, idx) => {
                                    const isPositive = attr.net_pnl > 0;
                                    return (
                                        <tr key={idx}>
                                            <td className={styles.highlightRow}>{attr.category}</td>
                                            <td className={styles.sportTag}>{attr.sport}</td>
                                            <td>{attr.win_rate}</td>
                                            <td className={isPositive ? styles.positiveData : styles.negativeData}>
                                                {isPositive ? '+' : '-'}${Math.abs(attr.net_pnl).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                            </td>
                                            <td className={isPositive ? styles.positiveData : styles.negativeData}>
                                                {isPositive ? '+' : ''}{attr.roi.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
