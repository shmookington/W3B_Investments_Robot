'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import styles from './page.module.css';

interface SimDataPoint {
    day: string;
    live_pnl: number;
    shadow_pnl: number;
}

export default function SimLabPage() {
    // 1. Backtest Configuration State
    const [strategy, setStrategy] = useState('MEAN_REVERSION_V5');
    const [dateRange, setDateRange] = useState('90_DAYS');
    const [virtualCapital, setVirtualCapital] = useState(100000);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationComplete, setSimulationComplete] = useState(true);

    // 2. Chart Comparison Mock Data
    const [simData] = useState<SimDataPoint[]>([
        { day: 'Day 1', live_pnl: 100000, shadow_pnl: 100000 },
        { day: 'Day 15', live_pnl: 104200, shadow_pnl: 102100 },
        { day: 'Day 30', live_pnl: 101100, shadow_pnl: 106400 },
        { day: 'Day 45', live_pnl: 112000, shadow_pnl: 115200 },
        { day: 'Day 60', live_pnl: 108500, shadow_pnl: 121000 },
        { day: 'Day 75', live_pnl: 115000, shadow_pnl: 134500 },
        { day: 'Day 90', live_pnl: 121400, shadow_pnl: 148200 },
    ]);

    const handleRunSimulation = () => {
        setIsSimulating(true);
        setSimulationComplete(false);
        setTimeout(() => {
            setIsSimulating(false);
            setSimulationComplete(true);
        }, 2000);
    };

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>SIM LAB (SHADOW ENVIRONMENT)</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                <div className={styles.layoutSplit}>
                    {/* LEFT PANEL: CONFIGURATION */}
                    <div className={styles.configPanel}>
                        <div className={styles.panelHeader}>
                            <h2>SHADOW ENGINE CONFIGURATION</h2>
                            <span className={styles.headerTag}>SANDBOX PARAMS</span>
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label>TARGET HISTORICAL ALGORITHM</label>
                            <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className={styles.selectBox}>
                                <option value="MEAN_REVERSION_V5">NBA Mean Reversion V5 (Experimental)</option>
                                <option value="EPL_CORNERS_DECAY">EPL Corner Decay Heuristics</option>
                                <option value="NFL_WIND_TOTALS">NFL Wind Shear Yield</option>
                                <option value="CORRELATION_HEDGER">Cross-Exchange Alpha Hedger</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>RETROACTIVE TIMELINE SNAPSHOT</label>
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={styles.selectBox}>
                                <option value="30_DAYS">Trailing 30 Days (Short Term Vol)</option>
                                <option value="90_DAYS">Trailing 90 Days (Quarterly Shift)</option>
                                <option value="365_DAYS">Trailing 1 Year (Macro Regime)</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>VIRTUAL DEPLOYMENT CAPITAL ($)</label>
                            <input 
                                type="number" 
                                value={virtualCapital} 
                                onChange={(e) => setVirtualCapital(Number(e.target.value))} 
                                className={styles.inputBox}
                            />
                        </div>

                        <div className={styles.divider}></div>

                        <div className={styles.formGroup}>
                            <label>MAXIMUM ACCEPTABLE DRAWDOWN (%)</label>
                            <input type="range" min="1" max="50" defaultValue="15" className={styles.slider} />
                        </div>

                        <button 
                            className={`${styles.runBtn} ${isSimulating ? styles.btnSimulating : ''}`}
                            onClick={handleRunSimulation}
                            disabled={isSimulating}
                        >
                            {isSimulating ? '[ COMPILING FLIGHT PATH... ]' : '[ INITIALIZE SHADOW BACKTEST ]'}
                        </button>
                    </div>

                    {/* RIGHT PANEL: OUTPUT & OVERLAY */}
                    <div className={styles.outputPanel}>
                        <div className={styles.panelHeader}>
                            <h2>COMPARISON OVERLAY: LIVE VS SHADOW</h2>
                            <span className={styles.headerTag}>YIELD TRAJECTORY</span>
                        </div>
                        
                        <div className={styles.overlayLegend}>
                            <div className={styles.legendItem}>
                                <div className={styles.legendDot} style={{background: '#ffb800'}}></div>
                                <span>LIVE ENGINE (HISTORICAL BASELINE)</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={styles.legendDot} style={{background: '#00f0ff'}}></div>
                                <span>SHADOW ENGINE (SIMULATED YIELD)</span>
                            </div>
                        </div>

                        {/* Chart Overlay */}
                        <div className={`${styles.chartWrapper} ${isSimulating ? styles.chartBlur : ''}`}>
                            {simulationComplete ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={simData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ffb800" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ffb800" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="shadowGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'rgba(5, 5, 8, 0.95)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Area type="monotone" dataKey="live_pnl" name="Live Engine Baseline" stroke="#ffb800" fill="url(#liveGrad)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="shadow_pnl" name="Shadow Simulation" stroke="#00f0ff" fill="url(#shadowGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.loadingData}>
                                    <div className={styles.spinner}></div>
                                    <p>PROCESSING {dateRange} RETROACTIVE VECTORS...</p>
                                </div>
                            )}
                        </div>

                        {/* Shadow Output Summary */}
                        {simulationComplete && (
                            <div className={styles.shadowStats}>
                                <div className={styles.statBox}>
                                    <div className={styles.statLabel}>SIMULATED NET ALPHA</div>
                                    <div className={styles.statValue}>+$26,800</div>
                                    <div className={styles.statContext}>Raw Capital Gain over Baseline</div>
                                </div>
                                <div className={styles.statBox}>
                                    <div className={styles.statLabel}>SHARPE RATIO (SHADOW)</div>
                                    <div className={styles.statValue}>2.84</div>
                                    <div className={styles.statContext}>Risk-Adjusted Dominance</div>
                                </div>
                                <div className={styles.statBox}>
                                    <div className={styles.statLabel}>MAX DRAWDOWN</div>
                                    <div className={styles.statValueDrawdown}>-8.2%</div>
                                    <div className={styles.statContext}>Within safety tolerance parameters</div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
