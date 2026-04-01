'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/Layout';
import { MonolithNav } from '@/components/MonolithNav';
import { HoloLabel } from '@/components/HoloText';
import styles from './page.module.css';

interface PipelineStatus {
    id: string;
    name: string;
    status: 'SYNCED' | 'WARN' | 'PENDING' | 'OFFLINE';
    last_sync: string;
}

interface SportHealth {
    sport: string;
    pipelines: PipelineStatus[];
}

interface SlateEvent {
    id: string;
    sport: string;
    matchup: string;
    start_time: string;
    projections_count: number;
    pricing_status: 'PRICED' | 'CALCULATING' | 'HALTED';
}

interface DegradationAlert {
    id: string;
    sport: string;
    severity: 'CRITICAL' | 'WARN';
    message: string;
}

export default function SportsHubPage() {
    // Mock Data mimicking the quantitative backend real-world feeds
    const [alerts] = useState<DegradationAlert[]>([
        { id: 'a1', sport: 'NBA', severity: 'WARN', message: 'Injury probability matrix degraded: Waiting on LAL final lineup confirmation.' },
        { id: 'a2', sport: 'NFL', severity: 'CRITICAL', message: 'Weather forecasting API unresponsive. Point Total models halted for PIT vs CLE.' }
    ]);

    const [health] = useState<SportHealth[]>([
        {
            sport: 'NBA',
            pipelines: [
                { id: 'p1', name: 'NBA Advanced Stats', status: 'SYNCED', last_sync: '12s ago' },
                { id: 'p2', name: 'DraftKings Odds', status: 'SYNCED', last_sync: '4s ago' },
                { id: 'p3', name: 'Underdog Props', status: 'WARN', last_sync: '4m ago' }
            ]
        },
        {
            sport: 'NFL',
            pipelines: [
                { id: 'p4', name: 'NFL NextGen Stats', status: 'SYNCED', last_sync: '1m ago' },
                { id: 'p5', name: 'Weather API', status: 'OFFLINE', last_sync: '22m ago' }
            ]
        },
        {
            sport: 'SOCCER',
            pipelines: [
                { id: 'p6', name: 'Opta Event Feed', status: 'SYNCED', last_sync: '2s ago' },
                { id: 'p7', name: 'Pinnacle Asian Lines', status: 'PENDING', last_sync: 'Waiting...' }
            ]
        }
    ]);

    const [slate] = useState<SlateEvent[]>([
        { id: 'e1', sport: 'NBA', matchup: 'BOS Celtics @ MIL Bucks', start_time: '2026-04-01T19:30:00Z', projections_count: 14205, pricing_status: 'PRICED' },
        { id: 'e2', sport: 'NBA', matchup: 'LAL Lakers @ DEN Nuggets', start_time: '2026-04-01T22:00:00Z', projections_count: 8540, pricing_status: 'CALCULATING' },
        { id: 'e3', sport: 'NBA', matchup: 'MIA Heat @ NYK Knicks', start_time: '2026-04-01T19:00:00Z', projections_count: 12100, pricing_status: 'PRICED' },
        { id: 'e4', sport: 'NFL', matchup: 'PIT Steelers @ CLE Browns', start_time: '2026-04-02T20:15:00Z', projections_count: 4200, pricing_status: 'HALTED' },
        { id: 'e5', sport: 'SOCCER', matchup: 'Arsenal vs Man City', start_time: '2026-04-01T15:00:00Z', projections_count: 31050, pricing_status: 'PRICED' },
    ]);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    };

    return (
        <PageContainer>
            <div style={{ paddingBottom: '24px' }}>
                <HoloLabel>ASSET CLASSES (UNDERLYING)</HoloLabel>
            </div>
            
            <MonolithNav />

            <div className={styles.container}>
                
                {/* 1. CONFIDENCE DEGRADATION ALERTS */}
                {alerts.length > 0 && (
                    <div className={styles.panel}>
                        <div className={`${styles.panelHeader} ${styles.alertHeader}`}>
                            <h2>⚠ DATA DEGRADATION DETECTED</h2>
                            <span className={styles.headerTag}>SYSTEMIC CONFIDENCE ALERTS</span>
                        </div>
                        <div className={styles.alertsContainer}>
                            {alerts.map(alert => (
                                <div key={alert.id} className={`${styles.alertItem} ${alert.severity === 'CRITICAL' ? styles.alertCritical : styles.alertWarn}`}>
                                    <span className={styles.alertSport}>[{alert.sport}]</span>
                                    <span className={styles.alertMessage}>{alert.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. PIPELINE HEALTH PER SPORT */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>PIPELINE HEALTH ROUTING</h2>
                        <span className={styles.headerTag}>INGESTION MONITOR</span>
                    </div>
                    <div className={styles.healthGrid}>
                        {health.map(sportBlock => (
                            <div key={sportBlock.sport} className={styles.sportBlock}>
                                <div className={styles.sportBlockHeader}>{sportBlock.sport} ENGINES</div>
                                <div className={styles.pipelineList}>
                                    {sportBlock.pipelines.map(pipe => (
                                        <div key={pipe.id} className={styles.pipelineItem}>
                                            <span className={styles.pipelineName}>{pipe.name}</span>
                                            <span className={`${styles.pipelineStatus} ${styles[`status${pipe.status}`]}`}>
                                                [{pipe.status === 'SYNCED' ? `SYNCED ${pipe.last_sync}` : pipe.status}]
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. THE ACTIVE SLATE */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>THE ACTIVE SLATE</h2>
                        <span className={styles.headerTag}>{slate.length} EVENTS LOADED</span>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.slateTable}>
                            <thead>
                                <tr>
                                    <th>SPORT</th>
                                    <th>MATCHUP / EVENT</th>
                                    <th>START TIME</th>
                                    <th>PROJECTIONS CALCULATED</th>
                                    <th>PRICING STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slate.map((event) => (
                                    <tr key={event.id}>
                                        <td><span className={styles.sportBadge}>{event.sport}</span></td>
                                        <td className={styles.matchupText}>{event.matchup}</td>
                                        <td className={styles.dimRow}>{formatTime(event.start_time)}</td>
                                        <td className={styles.projectionsText}>
                                            {event.projections_count.toLocaleString()} <span className={styles.dimRow}>vectors</span>
                                        </td>
                                        <td>
                                            <span className={`${styles.pricingBadge} ${styles[`pricing${event.pricing_status}`]}`}>
                                                {event.pricing_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </PageContainer>
    );
}
