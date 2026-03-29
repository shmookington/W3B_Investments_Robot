'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './NotificationCenter.module.css';

/**
 * NotificationCenter — Global toast/banner notification system
 *
 * Categories:
 *   🔴 critical  — circuit breaker trip, engine down, exploit alert
 *   🟡 warning   — stale data, high drawdown, connection issues
 *   🔵 info      — position fill, regime change, model update
 *   🟢 success   — deposit confirmed, position profitable, recovery complete
 *
 * Persistence:
 *   critical = stays until dismissed
 *   warning  = auto-dismiss 15s
 *   info     = auto-dismiss 5s
 *   success  = auto-dismiss 5s
 */

export type NotificationCategory = 'critical' | 'warning' | 'info' | 'success';

export interface AppNotification {
    id: string;
    category: NotificationCategory;
    title: string;
    message: string;
    timestamp: Date;
    dismissed: boolean;
    autoDismiss?: boolean;
}

// ── Notification store (module-level for cross-component access) ──

let _listeners: (() => void)[] = [];
let _notifications: AppNotification[] = [];
let _nextId = 1;

function emitChange() {
    _listeners.forEach((fn) => fn());
}

export function pushNotification(
    category: NotificationCategory,
    title: string,
    message: string,
): AppNotification {
    const n: AppNotification = {
        id: `notif-${_nextId++}`,
        category,
        title,
        message,
        timestamp: new Date(),
        dismissed: false,
        autoDismiss: category !== 'critical',
    };
    _notifications = [n, ..._notifications].slice(0, 100); // Max 100
    emitChange();
    return n;
}

export function dismissNotification(id: string) {
    _notifications = _notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n,
    );
    emitChange();
}

export function clearAll() {
    _notifications = _notifications.map((n) => ({ ...n, dismissed: true }));
    emitChange();
}

function useNotifications(): AppNotification[] {
    const [, setTick] = useState(0);
    useEffect(() => {
        const handler = () => setTick((t) => t + 1);
        _listeners.push(handler);
        return () => {
            _listeners = _listeners.filter((l) => l !== handler);
        };
    }, []);
    return _notifications;
}

// ── Category config ──

const CATEGORY_CONFIG: Record<NotificationCategory, { icon: string; color: string; dismissMs: number }> = {
    critical: { icon: '🔴', color: '#ff4444', dismissMs: 0 },
    warning: { icon: '🟡', color: '#ffbd2e', dismissMs: 15000 },
    info: { icon: '🔵', color: '#00e5ff', dismissMs: 5000 },
    success: { icon: '🟢', color: '#28ca41', dismissMs: 5000 },
};

// ── Toast Component ──

function Toast({ notification }: { notification: AppNotification }) {
    const config = CATEGORY_CONFIG[notification.category];

    useEffect(() => {
        if (notification.autoDismiss && config.dismissMs > 0) {
            const timer = setTimeout(() => dismissNotification(notification.id), config.dismissMs);
            return () => clearTimeout(timer);
        }
    }, [notification.id, notification.autoDismiss, config.dismissMs]);

    return (
        <div className={styles.toast} style={{ borderLeftColor: config.color }}>
            <div className={styles.toastHeader}>
                <span className={styles.toastIcon}>{config.icon}</span>
                <span className={styles.toastTitle}>{notification.title}</span>
                <span className={styles.toastTime}>
                    {notification.timestamp.toLocaleTimeString()}
                </span>
                <button
                    className={styles.toastClose}
                    onClick={() => dismissNotification(notification.id)}
                >
                    ×
                </button>
            </div>
            <div className={styles.toastBody}>{notification.message}</div>
        </div>
    );
}

// ── History Drawer ──

function HistoryDrawer({
    open,
    onClose,
    notifications,
}: {
    open: boolean;
    onClose: () => void;
    notifications: AppNotification[];
}) {
    if (!open) return null;

    return (
        <div className={styles.drawerOverlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.drawerHeader}>
                    <span>Notification History</span>
                    <button className={styles.drawerClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.drawerList}>
                    {notifications.length === 0 ? (
                        <div className={styles.drawerEmpty}>No notifications</div>
                    ) : (
                        notifications.map((n) => {
                            const config = CATEGORY_CONFIG[n.category];
                            return (
                                <div key={n.id} className={styles.historyItem} style={{ borderLeftColor: config.color }}>
                                    <div className={styles.historyHeader}>
                                        <span>{config.icon} {n.title}</span>
                                        <span className={styles.historyTime}>
                                            {n.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className={styles.historyBody}>{n.message}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main NotificationCenter ──

export function NotificationCenter() {
    const notifications = useNotifications();
    const [historyOpen, setHistoryOpen] = useState(false);

    const visibleToasts = notifications.filter((n) => !n.dismissed).slice(0, 5);
    const unreadCount = notifications.filter((n) => !n.dismissed).length;

    return (
        <>
            {/* Toast stack */}
            <div className={styles.toastContainer}>
                {visibleToasts.map((n) => (
                    <Toast key={n.id} notification={n} />
                ))}
            </div>

            {/* History toggle button */}
            <button
                className={styles.historyButton}
                onClick={() => setHistoryOpen(true)}
                title="Notification history"
            >
                🔔
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {/* History drawer */}
            <HistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                notifications={notifications}
            />
        </>
    );
}
