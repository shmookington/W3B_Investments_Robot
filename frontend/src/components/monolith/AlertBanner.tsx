'use client';

import { useState, useCallback } from 'react';
import styles from './AlertBanner.module.css';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface Alert {
    id: string;
    severity: AlertSeverity;
    message: string;
    timestamp: number;
    dismissed?: boolean;
}

interface Props {
    alerts: Alert[];
    onDismiss?: (id: string) => void;
    soundEnabled?: boolean;
}

/**
 * AlertBanner — full-width alert banners at page top.
 * 4 severity levels: INFO (cyan), WARNING (amber), CRITICAL (red + flicker), EMERGENCY (red pulse + glitch).
 */
export function AlertBanner({ alerts, onDismiss, soundEnabled = false }: Props) {
    const [showHistory, setShowHistory] = useState(false);

    const active = alerts.filter(a => !a.dismissed);
    const history = alerts.filter(a => a.dismissed);

    const hasEmergency = active.some(a => a.severity === 'emergency');

    const dismiss = useCallback((id: string) => {
        onDismiss?.(id);
    }, [onDismiss]);

    const severityIcon: Record<AlertSeverity, string> = {
        info: '🟢',
        warning: '🟡',
        critical: '🔴',
        emergency: '⚫',
    };

    return (
        <>
            {/* Emergency grid color shift */}
            {hasEmergency && <div className={styles.emergencyOverlay} />}

            {/* Active alerts */}
            <div className={styles.bannerStack}>
                {active.map(alert => (
                    <div key={alert.id} className={`${styles.banner} ${styles[alert.severity]}`}>
                        <div className={styles.gridPattern} />
                        <span className={styles.icon}>{severityIcon[alert.severity]}</span>
                        <span className={styles.message}>{alert.message}</span>
                        <span className={styles.time}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        <button className={styles.dismissBtn} onClick={() => dismiss(alert.id)}>×</button>
                    </div>
                ))}
            </div>

            {/* History toggle */}
            {history.length > 0 && (
                <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
                    {showHistory ? 'HIDE' : 'SHOW'} ALERT HISTORY ({history.length})
                </button>
            )}

            {/* History log */}
            {showHistory && (
                <div className={styles.historyLog}>
                    {history.map(alert => (
                        <div key={alert.id} className={styles.historyItem}>
                            <span className={styles.histIcon}>{severityIcon[alert.severity]}</span>
                            <span className={styles.histMsg}>{alert.message}</span>
                            <span className={styles.histTime}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden audio elements for sound alerts */}
            {soundEnabled && (
                <>
                    <audio id="alert-critical" preload="none" />
                    <audio id="alert-emergency" preload="none" />
                </>
            )}
        </>
    );
}
