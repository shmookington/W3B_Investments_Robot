'use client';

import { useState, useRef, useCallback, type ReactNode, type MouseEvent } from 'react';
import styles from './TerminalWindow.module.css';

interface Props {
    title: string;
    children: ReactNode;
    defaultX?: number;
    defaultY?: number;
    defaultW?: number;
    defaultH?: number;
    onClose?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
}

/**
 * TerminalWindow — draggable, resizable holographic terminal panel.
 * HoloPanel base with title bar, window controls, CRT scanlines,
 * focus glow, and drag translucency.
 */
export function TerminalWindow({
    title, children, defaultX = 0, defaultY = 0,
    defaultW = 400, defaultH = 300,
    onClose, onMinimize, onMaximize,
}: Props) {
    const [pos, setPos] = useState({ x: defaultX, y: defaultY });
    const [size, setSize] = useState({ w: defaultW, h: defaultH });
    const [dragging, setDragging] = useState(false);
    const [focused, setFocused] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const onMouseDown = useCallback((e: MouseEvent) => {
        setDragging(true);
        setFocused(true);
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

        const onMove = (ev: globalThis.MouseEvent) => {
            setPos({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
        };
        const onUp = () => {
            setDragging(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [pos]);

    const onResizeDown = useCallback((e: MouseEvent) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = size.w;
        const startH = size.h;

        const onMove = (ev: globalThis.MouseEvent) => {
            setSize({ w: Math.max(200, startW + ev.clientX - startX), h: Math.max(150, startH + ev.clientY - startY) });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [size]);

    const handleMinimize = () => { setMinimized(!minimized); onMinimize?.(); };
    const handleMaximize = () => { onMaximize?.(); };
    const handleClose = () => { onClose?.(); };

    return (
        <div
            className={`${styles.terminal} ${focused ? styles.focused : ''} ${dragging ? styles.dragging : ''}`}
            style={{ left: pos.x, top: pos.y, width: size.w, height: minimized ? 'auto' : size.h }}
            onMouseDown={() => setFocused(true)}
        >
            {/* CRT scanlines */}
            <div className={styles.scanlines} />

            {/* Title bar */}
            <div className={styles.titleBar} onMouseDown={onMouseDown}>
                <span className={styles.title}>{title}</span>
                <div className={styles.controls}>
                    <button className={styles.ctrlBtn} onClick={handleMinimize} title="Minimize">
                        <span className={styles.ctrlMin}>─</span>
                    </button>
                    <button className={styles.ctrlBtn} onClick={handleMaximize} title="Maximize">
                        <span className={styles.ctrlMax}>□</span>
                    </button>
                    <button className={`${styles.ctrlBtn} ${styles.ctrlClose}`} onClick={handleClose} title="Close">
                        <span>×</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            {!minimized && (
                <div className={styles.content}>
                    {children}
                </div>
            )}

            {/* Resize handle */}
            {!minimized && <div className={styles.resizeHandle} onMouseDown={onResizeDown} />}
        </div>
    );
}
