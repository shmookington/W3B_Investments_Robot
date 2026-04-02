'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MonolithNav.module.css';

const NAV_ITEMS = [
    { href: '/monolith', label: 'OVERVIEW' },
    { href: '/monolith/terminal', label: '◆ TERMINAL' },
    { href: '/monolith/hot', label: '🔥 HOT BETS' },
    { href: '/monolith/pnl', label: '📊 P&L TRACKER' },
    { href: '/monolith/sports', label: 'ASSET CLASSES' },
    { href: '/monolith/regime', label: 'REGIME' },
    { href: '/monolith/risk', label: 'RISK' },
    { href: '/monolith/alpha', label: 'ALPHA' },
    { href: '/monolith/execution', label: 'EXECUTION' },
    { href: '/monolith/data', label: 'DATA' },
    { href: '/monolith/backtest', label: 'SIM LAB' },
    { href: '/monolith/portfolio', label: 'PORTFOLIO' },
    { href: '/monolith/lanes', label: 'LANES' },
];

export function MonolithNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.subNav}>
            {NAV_ITEMS.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.subNavLink} ${pathname === item.href ? styles.subNavActive : ''}`}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}
