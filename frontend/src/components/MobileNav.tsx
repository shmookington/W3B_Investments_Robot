'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileNav.module.css';

const TABS = [
    { href: '/', label: 'HOME', icon: '⌂' },
    { href: '/dashboard', label: 'DASH', icon: '◎' },
    { href: '/vault', label: 'VAULT', icon: '⬡' },
    { href: '/performance', label: 'PERF', icon: '◈' },
    { href: '/monolith', label: 'OPS', icon: '▦' },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.mobileNav}>
            <div className={styles.tabBar}>
                {TABS.map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`${styles.tab} ${pathname === tab.href ? styles.tabActive : ''}`}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
