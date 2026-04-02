'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import { motion, useAnimation } from 'framer-motion';
import styles from './page.module.css';

interface Exposure {
    asset: string;
    description: string;
    concentration_pct: number;
    risk_level: 'SAFE' | 'WARN' | 'CORRELATION DANGER';
}

export default function RiskManagementPage() {
    // State for the Kill Switch Long Press
    const [isPressing, setIsPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [systemHalted, setSystemHalted] = useState(false);

    // Mock Risk Data
    const varAmount = 42550.00; // Value At Risk
    const totalCapital = 283450.00;
    const varPct = (varAmount / totalCapital) * 100;

    const exposures: Exposure[] = [
        { asset: 'LAL ML', description: 'Los Angeles Lakers Moneyline across 3 books', concentration_pct: 42.5, risk_level: 'CORRELATION DANGER' },
        { asset: 'O51.5 KC/BAL', description: 'NFL Week 1 Over Total Correlation', concentration_pct: 18.2, risk_level: 'WARN' },
        { asset: 'ARS -1.5', description: 'Arsenal Spread (Premier League)', concentration_pct: 8.4, risk_level: 'SAFE' },
        { asset: 'DEN ML', description: 'Denver Nuggets Series Future', concentration_pct: 4.1, risk_level: 'SAFE' },
    ];

    // Handle 3-second explicit long press
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPressing && !systemHalted) {
            timer = setInterval(() => {
                setProgress(p => {
                    const next = p + (100 / 30); // Reach 100 in ~3 seconds (30 ticks of 100ms)
                    if (next >= 100) {
                        clearInterval(timer);
                        setSystemHalted(true);
                        setIsPressing(false);
                        return 100;
                    }
                    return next;
                });
            }, 100);
        } else {
            if (!systemHalted) setProgress(0);
        }
        return () => clearInterval(timer);
    }, [isPressing, systemHalted]);

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>SYSTEMIC RISK & VaR</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. FAT-TAIL VALUE AT RISK (VaR) */}
                <div className={styles.varPanel}>
                    <div className={styles.varHeader}>
                        <h2>ATA (ABSOLUTE THERMAL ANNIHILATION)</h2>
                        <span className={styles.headerTag}>MAXIMUM PROBABILITY INVERSION</span>
                    </div>
                    <div className={styles.varContent}>
                        <div className={styles.varSubtext}>IF 100% OF CURRENT EXECUTED PROBABILITIES INVERT NEGATIVELY, THIS IS THE TOTAL REALIZED LOSS.</div>
                        <div className={styles.varNumber}>
                            -${varAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}
                        </div>
                        <div className={styles.varPct}>({varPct.toFixed(1)}% OF VAULT LIQUIDITY)</div>
                    </div>
                </div>

                {/* 2. EXPOSURE LIMITS & CORRELATION */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>CORRELATION EXPOSURE MONITOR</h2>
                        <span className={styles.headerTag}>ASSET CONCENTRATION</span>
                    </div>
                    <div className={styles.exposureList}>
                        {exposures.map((exp, idx) => {
                            const isDanger = exp.risk_level === 'CORRELATION DANGER';
                            return (
                                <div key={idx} className={`${styles.exposureItem} ${isDanger ? styles.dangerExposure : ''}`}>
                                    <div className={styles.expInfo}>
                                        <div className={styles.expAsset}>{exp.asset}</div>
                                        <div className={styles.expDesc}>{exp.description}</div>
                                    </div>
                                    <div className={styles.expMetrics}>
                                        <div className={styles.expPct}>{exp.concentration_pct.toFixed(1)}% EXPOSURE</div>
                                        <div className={`${styles.expBadge} ${styles[`badge${exp.risk_level.replace(' ', '')}`]}`}>
                                            [{exp.risk_level}]
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. THE KILL SWITCH */}
                <div className={styles.killSwitchPanel}>
                    <div className={styles.killSwitchHeader}>
                        <h2>EMERGENCY OVERRIDE</h2>
                        <span className={styles.headerTag}>SYSTEM HALT</span>
                    </div>

                    {!systemHalted ? (
                        <div className={styles.killSwitchContainer}>
                            <p className={styles.killSwitchWarning}>
                                WARNING: ACTIVATING THIS SWITCH WILL LIQUIDATE ALL OPEN MARKET POSITIONS AT CURRENT BIDS AND SEVER API CONNECTIONS GLOBALLY.
                            </p>
                            <div className={styles.buttonWrapper}>
                                <motion.div 
                                    className={styles.progressRing}
                                    style={{ background: `conic-gradient(#ff2a2a ${progress}%, transparent ${progress}%)` }}
                                ></motion.div>
                                <motion.button
                                    className={styles.killButton}
                                    onPointerDown={() => setIsPressing(true)}
                                    onPointerUp={() => setIsPressing(false)}
                                    onPointerLeave={() => setIsPressing(false)}
                                    whileTap={{ scale: 0.95 }}
                                    animate={isPressing ? { 
                                        boxShadow: "0 0 40px rgba(255, 42, 42, 0.8)",
                                        textShadow: "0 0 10px rgba(255, 255, 255, 1)",
                                    } : {}}
                                >
                                    HOLD TO LIQUIDATE
                                </motion.button>
                            </div>
                            <div className={styles.holdText}>Requires 3-second authorization hold</div>
                        </div>
                    ) : (
                        <div className={styles.haltedState}>
                            <h1 className={styles.haltedText}>SYSTEM TERMINATED</h1>
                            <p>All quantitative execution pipelines have been severed. Manual reset required.</p>
                        </div>
                    )}
                </div>

            </div>
        </PageContainer>
    );
}
