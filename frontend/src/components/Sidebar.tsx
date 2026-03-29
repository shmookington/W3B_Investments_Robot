'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const SIDEBAR_LINKS = [
    { href: '/', label: 'HOME', icon: '⌂' },
    { href: '/dashboard', label: 'DASHBOARD', icon: '◎' },
    { href: '/vault', label: 'VAULT', icon: '⬡' },
    { href: '/performance', label: 'PERFORMANCE', icon: '◈' },
    { href: '/audit', label: 'TRACK RECORD', icon: '✓' },
    { href: '/monolith', label: 'OPS CENTER', icon: '▦' },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
            <nav className={styles.sidebarNav}>
                {SIDEBAR_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`${styles.sidebarLink} ${pathname === link.href ? styles.sidebarLinkActive : ''}`}
                        title={link.label}
                    >
                        <span className={styles.sidebarIcon}>{link.icon}</span>
                        <span className={styles.sidebarLabel}>{link.label}</span>
                    </Link>
                ))}
            </nav>

            <button
                className={styles.collapseBtn}
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? '»' : '«'}
            </button>
        </aside>
    );
}
