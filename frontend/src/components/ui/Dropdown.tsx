'use client';
import { useState, useRef, useEffect } from 'react';
import styles from './Dropdown.module.css';

interface Option { value: string; label: string; }
interface DropdownProps { options: Option[]; value?: string; onChange: (v: string) => void; placeholder?: string; label?: string; }

export function Dropdown({ options, value, onChange, placeholder = 'SELECT', label }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className={styles.wrapper} ref={ref}>
            {label && <span className={styles.label}>{label}</span>}
            <button className={`${styles.trigger} ${open ? styles.open : ''}`} onClick={() => setOpen(!open)}>
                <span>{selected?.label || placeholder}</span>
                <span className={styles.arrow}>▾</span>
            </button>
            {open && (
                <div className={styles.menu}>
                    {options.map((opt) => (
                        <button key={opt.value} className={`${styles.option} ${opt.value === value ? styles.active : ''}`} onClick={() => { onChange(opt.value); setOpen(false); }}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
