'use client';

import { useState, useEffect, useCallback } from 'react';
import { monolith, HealthCheck } from '@/lib/api';
import styles from './EngineStatus.module.css';

/**
 * EngineStatus — Header status indicator
 *
 * Polls MONOLITH /health every 30s and shows:
 *   🟢 Running   — prediction engine healthy, recent positions
 *   🟡 Degraded  — engine up but issues detected (stale data, high resource usage)
 *   🔴 Offline   — engine unreachable or in error state
 */

type StatusLevel = 'online' | 'degraded' | 'offline';

function deriveStatus(health: HealthCheck | null, fetchError: boolean): StatusLevel {
    if (fetchError || !health) return 'offline';
    if (health.status === 'error') return 'offline';

    // Check for degradation signals (all with safe fallbacks)
    const isDegraded =
        (health.system?.cpu_percent ?? 0) > 90 ||
        (health.system?.memory_percent ?? 0) > 90 ||
        (health.system?.disk_percent ?? 0) > 90 ||
        (health.last_trade?.seconds_ago != null && health.last_trade.seconds_ago > 86400);

    if (isDegraded) return 'degraded';
    return 'online';
}

const STATUS_CONFIG: Record<StatusLevel, { label: string; color: string }> = {
    online: { label: 'ONLINE', color: '#28ca41' },
    degraded: { label: 'DEGRADED', color: '#ffbd2e' },
    offline: { label: 'OFFLINE', color: '#ff4444' },
};

export function EngineStatus() {
    const [health, setHealth] = useState<HealthCheck | null>(null);
    const [fetchError, setFetchError] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fetchHealth = useCallback(async () => {
        try {
            const data = await monolith.getHealth();
            setHealth(data);
            setFetchError(false);
        } catch {
            setFetchError(true);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30_000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const status = deriveStatus(health, fetchError);
    const config = STATUS_CONFIG[status];

    return (
        <div className={styles.wrapper}>
            <button
                className={styles.indicator}
                onClick={() => setExpanded(!expanded)}
                title={`Engine: ${config.label}`}
            >
                <span
                    className={styles.dot}
                    style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
                />
                <span className={styles.label} style={{ color: config.color }}>
                    {config.label}
                </span>
            </button>

            {expanded && health && (
                <div className={styles.dropdown}>
                    <div className={styles.row}>
                        <span className={styles.key}>Uptime</span>
                        <span className={styles.val}>{formatUptime(health.uptime_seconds)}</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.key}>Last Position</span>
                        <span className={styles.val}>
                            {health.last_trade?.seconds_ago
                                ? `${formatDuration(health.last_trade.seconds_ago)} ago`
                                : 'N/A'}
                        </span>
                    </div>
                    <div className={styles.divider} />
                    {health.exchanges?.map((ex) => (
                        <div key={ex.name} className={styles.row}>
                            <span className={styles.key}>{ex.name}</span>
                            <span className={styles.val} style={{ color: ex.status === 'connected' ? '#28ca41' : '#ff4444' }}>
                                {ex.status} ({ex.latency_ms}ms)
                            </span>
                        </div>
                    ))}
                    <div className={styles.divider} />
                    <div className={styles.row}>
                        <span className={styles.key}>CPU</span>
                        <span className={styles.val}>{health.system?.cpu_percent?.toFixed(1)}%</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.key}>Memory</span>
                        <span className={styles.val}>{health.system?.memory_percent?.toFixed(1)}%</span>
                    </div>
                    <div className={styles.row}>
                        <span className={styles.key}>Disk</span>
                        <span className={styles.val}>{health.system?.disk_percent?.toFixed(1)}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${m}m`;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}
