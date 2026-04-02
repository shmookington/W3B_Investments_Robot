'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import styles from './page.module.css';

interface ExchangeLiquidity {
    name: string;
    held_capital: number;
    required_capital: number;
    status: 'OPTIMAL' | 'DEFICIENT' | 'EXCESS';
    sweep_recommendation: string;
}

export default function PortfolioAuditPage() {
    // 1. Capital Efficiency Data
    const totalNAV = 450250.00;
    const deployedCapital = 385000.00;
    const idleCapital = totalNAV - deployedCapital;
    const deployedPct = (deployedCapital / totalNAV) * 100;
    const idlePct = (idleCapital / totalNAV) * 100;

    // 2. Cross-Exchange Liquidity
    const [exchanges] = useState<ExchangeLiquidity[]>([
        { name: 'KALSHI', held_capital: 154000, required_capital: 120000, status: 'EXCESS', sweep_recommendation: 'Sweep $34,000 back to Treasury' },
        { name: 'PINNACLE', held_capital: 42000, required_capital: 85000, status: 'DEFICIENT', sweep_recommendation: 'Route $43,000 from Treasury for Weekend Slate' },
        { name: 'TREASURY RE', held_capital: 254250, required_capital: 100000, status: 'OPTIMAL', sweep_recommendation: 'Sufficient Base Reserves' },
    ]);

    // 3. Asset Class Exposure (NAV %)
    const [exposureData] = useState([
        { asset: 'NBA Props', exposure_pct: 42.4, locked_capital: 190900 },
        { asset: 'EPL Totals', exposure_pct: 18.1, locked_capital: 81500 },
        { asset: 'NFL Variance', exposure_pct: 14.5, locked_capital: 65200 },
        { asset: 'UFC Futures', exposure_pct: 7.2, locked_capital: 32400 },
        { asset: 'MLB Runlines', exposure_pct: 3.3, locked_capital: 15000 },
    ]);

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>INTERNAL PORTFOLIO AUDIT</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. CAPITAL EFFICIENCY (CASH DRAG) */}
                <div className={styles.topPanelGrid}>
                    <div className={`${styles.panel} ${styles.efficiencyPanel}`}>
                        <div className={styles.panelHeader}>
                            <h2>CAPITAL EFFICIENCY RATIO</h2>
                            <span className={styles.headerTag}>LIQUIDITY UTILIZATION</span>
                        </div>
                        
                        <div className={styles.navRow}>
                            <div className={styles.navBlock}>
                                <span>NET ASSET VALUE (NAV)</span>
                                <div className={styles.navAmount}>${totalNAV.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                            </div>
                        </div>

                        <div className={styles.progressLabelRow}>
                            <span style={{ color: '#00f0ff' }}>DEPLOYED YIELDING ({deployedPct.toFixed(1)}%)</span>
                            <span style={{ color: '#ff2a2a' }}>IDLE CASH DRAG ({idlePct.toFixed(1)}%)</span>
                        </div>
                        
                        <div className={styles.progressBar}>
                            <div className={styles.progressDeployed} style={{ width: `${deployedPct}%` }}></div>
                            <div className={styles.progressIdle} style={{ width: `${100 - deployedPct}%` }}></div>
                        </div>

                        <div className={styles.efficiencySubtext}>
                            <strong>${idleCapital.toLocaleString()}</strong> is currently yielding 0% alpha. Idle capital threshold of 10% has been breached. Recommend establishing structural Delta-neutral positions to deploy excess liquidity.
                        </div>
                    </div>
                </div>

                {/* 2. CROSS-EXCHANGE BALANCE MANAGEMENT */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>EXCHANGE ROUTING & LIQUIDITY SWEEPS</h2>
                        <span className={styles.headerTag}>COUNTERPARTY ALLOCATION</span>
                    </div>

                    <div className={styles.exchangeGrid}>
                        {exchanges.map(ex => (
                            <div key={ex.name} className={`${styles.exchangeCard} ${styles[`status${ex.status}`]}`}>
                                <div className={styles.exCardHeader}>
                                    <span className={styles.exName}>{ex.name}</span>
                                    <span className={`${styles.exBadge} ${styles[`badge${ex.status}`]}`}>[{ex.status}]</span>
                                </div>
                                <div className={styles.exBody}>
                                    <div className={styles.exStatRow}>
                                        <span>HELD CAPITAL:</span>
                                        <span className={styles.exStatBright}>${ex.held_capital.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.exStatRow}>
                                        <span>REQUIRED BUFFER:</span>
                                        <span className={styles.exStatDim}>${ex.required_capital.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className={styles.routeAction}>
                                        <div className={styles.routeIcon}>↳</div>
                                        <div className={styles.routeText}>{ex.sweep_recommendation}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. EXPOSURE BY ASSET CLASS (NAV %) */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>ABSOLUTE NAV EXPOSURE VECTORS</h2>
                        <span className={styles.headerTag}>ASSET CLASS RISK CONCENTRATION</span>
                    </div>
                    
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={exposureData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="asset" type="category" width={120} tick={{ fill: '#fff', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', border: '1px solid #00f0ff', fontFamily: 'monospace', fontSize: '11px' }}
                                    itemStyle={{ color: '#00f0ff' }}
                                    formatter={(value: any, name: any, props: any) => [
                                        `${value.toFixed(1)}% ($${props.payload.locked_capital.toLocaleString()})`, 
                                        'NAV Exposure'
                                    ]}
                                />
                                <Bar dataKey="exposure_pct" fill="#00f0ff" barSize={20} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
