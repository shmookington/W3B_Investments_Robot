'use client';
import { useState, useRef } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps { content: string; children: React.ReactNode; }

export function Tooltip({ content, children }: TooltipProps) {
    const [show, setShow] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div className={styles.wrapper} ref={ref} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            {show && <div className={styles.tip} role="tooltip">{content}</div>}
        </div>
    );
}
