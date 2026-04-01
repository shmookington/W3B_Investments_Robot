'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import styles from './page.module.css';

interface RegimeShift {
    date: string;
    from: string;
    to: string;
    trigger: string;
    pnlImpact: number;
}

export default function RegimeMonitorPage() {
    // Current Market Regime State
    const [activeRegime, setActiveRegime] = useState('HIGH-VOLATILITY');
    
    // Parameter Overrides
    const [kellyMult, setKellyMult] = useState(0.85);
    const [volDampener, setVolDampener] = useState(1.50);
    const [maxEdge, setMaxEdge] = useState(12.0);

    const [shifts] = useState<RegimeShift[]>([
        { date: '2026-03-25T14:02:00Z', from: 'CHOP', to: 'HIGH-VOLATILITY', trigger: 'VIX Spiked > 22', pnlImpact: -2450.00 },
        { date: '2026-03-18T09:15:00Z', from: 'TRENDING', to: 'CHOP', trigger: 'Market Breadth Convergence', pnlImpact: 1420.50 },
        { date: '2026-03-05T18:30:00Z', from: 'MEAN-REVERTING', to: 'TRENDING', trigger: 'S&P 500 Breakout Vol', pnlImpact: 8400.25 },
        { date: '2026-02-28T04:10:00Z', from: 'CHOP', to: 'MEAN-REVERTING', trigger: 'RSI Rangebound Stability', pnlImpact: 3100.80 },
    ]);

    const handleOverrideSubmit = () => {
        alert(
            `OVERRIDE INITIATED:\n\nBase Kelly: ${kellyMult}x\nVol Dampener: ${volDampener}x\nMax Edge: ${maxEdge}%`
        );
    };

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>MACRO REGIME MONITOR</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. MASSIVE REGIME DISCRIMINATOR */}
                <div className={styles.discriminatorPanel}>
                    <div className={styles.discriminatorLabel}>CURRENT IDENTIFIED MARKET STATE</div>
                    <div className={`${styles.massiveRegime} ${styles[`regime${activeRegime.replace('-','')}`]}`}>
                        [{activeRegime}]
                    </div>
                    <div className={styles.discriminatorSubtext}>
                        SYSTEM IS OPERATING UNDER DEFENSIVE PARAMETERS. LIQUIDITY DEPLOYMENT CAPPED AT 40% OF NOMINAL CAPACITY.
                    </div>
                </div>

                <div className={styles.lowerGrid}>
                    
                    {/* 2. PARAMETER OVERRIDES (DANGER) */}
                    <div className={`${styles.panel} ${styles.dangerPanel}`}>
                        <div className={styles.panelHeader}>
                            <h2>⚠ PARAMETER OVERRIDES</h2>
                            <span className={styles.cautionTag}>STRUCTURAL RISK WARNING</span>
                        </div>
                        <div className={styles.dangerSubtext}>
                            WARNING: Adjusting these parameters bypasses automated quantitative safety checks. Invalid parameters may subject treasury funds to catastrophic ruin sequence.
                        </div>

                        <div className={styles.sliderGroup}>
                            <div className={styles.sliderHeader}>
                                <span>BASE KELLY MULTIPLIER</span>
                                <span className={styles.sliderValue}>{kellyMult.toFixed(2)}x</span>
                            </div>
                            <input 
                                type="range" min="0.1" max="2.0" step="0.05" 
                                value={kellyMult} 
                                onChange={(e) => setKellyMult(parseFloat(e.target.value))} 
                                className={styles.dangerSlider} 
                            />
                            <div className={styles.sliderScale}><span>0.1 (Defensive)</span><span>2.0 (Aggressive)</span></div>
                        </div>

                        <div className={styles.sliderGroup}>
                            <div className={styles.sliderHeader}>
                                <span>VOLATILITY DAMPENER</span>
                                <span className={styles.sliderValue}>{volDampener.toFixed(2)}x</span>
                            </div>
                            <input 
                                type="range" min="1.0" max="5.0" step="0.1" 
                                value={volDampener} 
                                onChange={(e) => setVolDampener(parseFloat(e.target.value))} 
                                className={styles.dangerSlider} 
                            />
                            <div className={styles.sliderScale}><span>1.0 (Linearity)</span><span>5.0 (Heavy Discount)</span></div>
                        </div>

                        <div className={styles.sliderGroup}>
                            <div className={styles.sliderHeader}>
                                <span>MAX EDGE TOLERANCE (%)</span>
                                <span className={styles.sliderValue}>{maxEdge.toFixed(1)}%</span>
                            </div>
                            <input 
                                type="range" min="1.0" max="25.0" step="0.5" 
                                value={maxEdge} 
                                onChange={(e) => setMaxEdge(parseFloat(e.target.value))} 
                                className={styles.dangerSlider} 
                            />
                            <div className={styles.sliderScale}><span>1% (Retail Grade)</span><span>25% (Extreme Arbitrage)</span></div>
                        </div>

                        <button className={styles.dangerExecuteBtn} onClick={handleOverrideSubmit}>
                            [ FORCE COMMIT OVERRIDES ]
                        </button>
                    </div>

                    {/* 3. HISTORICAL REGIME SHIFTS */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>HISTORICAL REGIME SHIFTS (30D)</h2>
                            <span className={styles.headerTag}>SYSTEM ADAPTATIONS</span>
                        </div>
                        
                        <div className={styles.timeline}>
                            {shifts.map((shift, idx) => {
                                const isPositive = shift.pnlImpact > 0;
                                return (
                                    <div key={idx} className={styles.timelineItem}>
                                        <div className={styles.timelineConnector}>
                                            <div className={styles.timelineDot}></div>
                                            {idx !== shifts.length - 1 && <div className={styles.timelineLine}></div>}
                                        </div>
                                        <div className={styles.timelineContent}>
                                            <div className={styles.timelineDate}>{formatDate(shift.date)}</div>
                                            <div className={styles.timelineShift}>
                                                <span className={styles.regimeDim}>{shift.from}</span>
                                                <span className={styles.arrow}>→</span>
                                                <span className={styles.regimeBright}>{shift.to}</span>
                                            </div>
                                            <div className={styles.timelineTrigger}>Trigger: {shift.trigger}</div>
                                            <div className={styles.timelineImpact}>
                                                Impact: <span className={isPositive ? styles.positiveData : styles.negativeData}>
                                                    {isPositive ? '+' : '-'}${Math.abs(shift.pnlImpact).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
