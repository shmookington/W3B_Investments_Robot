'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import styles from './page.module.css';

interface Signal {
    event_id: string;
    sport: string;
    market_type: string;
    target: string;
    action: string;
    model_probability: number;
    market_probability: number;
    edge_pct: number;
    kelly_fraction: number;
    recommended_stake: number;
    confidence: string;
    kickoff?: string;
    status?: string;
}

export default function PriorityExecutionsPage() {
    const [queue, setQueue] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncTime, setSyncTime] = useState<string>('');

    const fetchData = async () => {
        try {
            const res = await fetch('/api/engine/proxy?endpoint=api/signals/hot');
            const data = await res.json();
            
            if (data && Array.isArray(data.signals) && data.signals.length > 0) {
                setQueue(data.signals.sort((a: Signal, b: Signal) => b.edge_pct - a.edge_pct));
            } else {
                // Mock data to demonstrate the UI if engine lacks data or offline
                setQueue([
                    {
                        event_id: 'mock_1',
                        sport: 'NBA',
                        market_type: 'MONEYLINE',
                        target: 'Denver Nuggets',
                        action: 'WIN',
                        model_probability: 0.65,
                        market_probability: 0.52,
                        edge_pct: 13.0,
                        kelly_fraction: 0.12,
                        recommended_stake: 1250,
                        confidence: 'HIGH'
                    },
                    {
                        event_id: 'mock_2',
                        sport: 'SOCCER',
                        market_type: 'SPREAD',
                        target: 'Arsenal -1.5',
                        action: 'COVER',
                        model_probability: 0.45,
                        market_probability: 0.38,
                        edge_pct: 7.0,
                        kelly_fraction: 0.05,
                        recommended_stake: 500,
                        confidence: 'MEDIUM'
                    },
                    {
                        event_id: 'mock_3',
                        sport: 'NFL',
                        market_type: 'TOTAL',
                        target: 'Chiefs/Ravens O51.5',
                        action: 'OVER',
                        model_probability: 0.55,
                        market_probability: 0.52,
                        edge_pct: 3.0,
                        kelly_fraction: 0.02,
                        recommended_stake: 150,
                        confidence: 'LOW'
                    }
                ]);
            }
            setSyncTime(new Date().toLocaleTimeString());
        } catch (e) {
            console.error("Hot bets sync failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s poll
        return () => clearInterval(interval);
    }, []);

    const handleForceExecute = (signal: Signal) => {
        // Mock execute function
        alert(`FORCING EXECUTION: ${signal.target} (${signal.market_type}) @ $${signal.recommended_stake}`);
    };

    if (loading) {
        return (
            <PageContainer>
                <div style={{ paddingBottom: '24px' }}>
                    <HoloLabel>PRIORITY EXECUTIONS QUEUE</HoloLabel>
                </div>
                <MonolithNav />
                <div className={styles.loading}>SCANNING MARKETS...</div>
            </PageContainer>
        );
    }

    const renderSignalCard = (signal: Signal) => {
        // Color Coding: Gold for 5%+ edge, Red for 10%+ edge
        let edgeColorClass = styles.edgeNormal;
        if (signal.edge_pct >= 10) edgeColorClass = styles.edgeRed;
        else if (signal.edge_pct >= 5) edgeColorClass = styles.edgeGold;

        return (
            <div key={signal.event_id} className={`${styles.signalCard} ${edgeColorClass}`}>
                <div className={styles.cardMain}>
                    <div className={styles.conceptBlock}>
                        <span className={styles.sportTag}>{signal.sport}</span>
                        <div className={styles.baseConcept}>
                            {signal.target} <span className={styles.actionTag}>[{signal.action}]</span>
                        </div>
                        <div className={styles.marketType}>{signal.market_type}</div>
                    </div>
                    
                    <div className={styles.metricsBlock}>
                        <div className={styles.metric}>
                            <span className={styles.metricLabel}>W3B MODEL</span>
                            <span className={styles.metricValue}>{(signal.model_probability * 100).toFixed(1)}%</span>
                        </div>
                        <div className={styles.metric}>
                            <span className={styles.metricLabel}>KALSHI PROB</span>
                            <span className={styles.metricValue}>{(signal.market_probability * 100).toFixed(1)}%</span>
                        </div>
                        <div className={styles.metricHighlight}>
                            <span className={styles.metricLabel}>W3B ALPHA DELTA</span>
                            <span className={`${styles.edgeValue} ${edgeColorClass}`}>+{signal.edge_pct.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
                
                <div className={styles.cardAction}>
                    <div className={styles.stakeInfo}>
                        Recommended Stake: <span style={{color: 'white'}}>${signal.recommended_stake.toFixed(2)}</span>
                    </div>
                    <button 
                        className={styles.forceBtn} 
                        onClick={() => handleForceExecute(signal)}
                    >
                        [ FORCE EXECUTE ]
                    </button>
                </div>
            </div>
        );
    };

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>PRIORITY EXECUTIONS QUEUE</HoloLabel>
            </div>
            
            <MonolithNav />

            {/* V-Stacked Alpha Queue */}
            <div className={styles.queueContainer}>
                <div className={styles.queueHeader}>
                    <h2>🔥 HOT BETS (W3B ALPHA DELTA THRESHOLD)</h2>
                    <span className={styles.syncStatus}>UPDATED: {syncTime}</span>
                </div>
                
                <div className={styles.feed}>
                    {queue.length === 0 ? (
                        <div className={styles.empty}>QUEUE IS EMPTY (NO EDGES DETECTED)</div>
                    ) : (
                        queue.map(renderSignalCard)
                    )}
                </div>
            </div>

        </PageContainer>
    );
}
