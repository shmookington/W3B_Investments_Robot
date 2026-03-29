'use client';
import { useState, useCallback, createContext, useContext } from 'react';
import styles from './Toast.module.css';

type ToastType = 'info' | 'success' | 'warning' | 'error';
interface ToastItem { id: number; message: string; type: ToastType; }

const ToastCtx = createContext<{ toast: (msg: string, type?: ToastType) => void }>({ toast: () => { } });

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    return (
        <ToastCtx.Provider value={{ toast }}>
            {children}
            <div className={styles.container} aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
                        <span className={styles.message}>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}
