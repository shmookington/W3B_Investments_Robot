'use client';

import { useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [open, handleEscape]);

    if (!open) return null;

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
                {title && (
                    <div className={styles.header}>
                        <span className={styles.title}>{title}</span>
                        <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
                    </div>
                )}
                <div className={styles.body}>{children}</div>
            </div>
        </div>
    );
}
