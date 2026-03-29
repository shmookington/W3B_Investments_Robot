'use client';
import { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab { id: string; label: string; }
interface TabsProps { tabs: Tab[]; defaultTab?: string; onChange?: (id: string) => void; className?: string; }

export function Tabs({ tabs, defaultTab, onChange, className }: TabsProps) {
    const [active, setActive] = useState(defaultTab || tabs[0]?.id);
    return (
        <div className={`${styles.tabs} ${className || ''}`} role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active === tab.id}
                    className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
                    onClick={() => { setActive(tab.id); onChange?.(tab.id); }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
