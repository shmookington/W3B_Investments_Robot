'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { EngineStatus } from './EngineStatus';
import styles from './Header.module.css';

interface NavLink {
    href: string;
    label: string;
    requiresAuth?: boolean;
    adminOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
    { href: '/', label: 'HOME' },
    { href: '/dashboard', label: 'DASHBOARD', requiresAuth: true },
    { href: '/vault', label: 'VAULT' },
    { href: '/performance', label: 'PERFORMANCE' },
    { href: '/audit', label: 'TRACK RECORD' },
    { href: '/security', label: 'SECURITY' },
    { href: '/docs', label: 'DOCS' },
    { href: '/blog', label: 'BLOG' },
    { href: '/monolith', label: 'OPS', adminOnly: true },
];

export function Header() {
    const pathname = usePathname();
    const { user, isAdmin, isLoading, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Filter links based on auth state
    const visibleLinks = NAV_LINKS.filter((link) => {
        if (link.adminOnly && !isAdmin) return false;
        if (link.requiresAuth && !user) return false;
        return true;
    });

    // Don't render auth-dependent UI while loading
    const showAuthButtons = !isLoading;

    return (
        <>
            <header className={styles.header}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>W3B</Link>

                {/* Desktop Navigation */}
                <nav className={styles.nav}>
                    {visibleLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${styles.navLink} ${pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)) ? styles.navLinkActive : ''}`}
                        >
                            {link.label}
                            {link.adminOnly && <span className={styles.adminBadge}>🔑</span>}
                        </Link>
                    ))}
                </nav>

                {/* Right side */}
                <div className={styles.headerRight}>
                    {/* Engine status indicator (admin only) */}
                    {isAdmin && <EngineStatus />}



                    {/* Auth buttons */}
                    {showAuthButtons && (
                        <>
                            {!user ? (
                                <div className={styles.authButtons}>
                                    <Link href="/login" className={styles.loginBtn}>LOG IN</Link>
                                    <Link href="/register" className={styles.signupBtn}>SIGN UP</Link>
                                </div>
                            ) : (
                                <div className={styles.userMenu} ref={dropdownRef}>
                                    <button
                                        className={styles.userTrigger}
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                    >
                                        <span className={styles.userAvatar}>
                                            {user.email?.[0]?.toUpperCase() || '?'}
                                        </span>
                                        {isAdmin && <span className={styles.operatorDot} title="Operator Mode" />}
                                    </button>

                                    {dropdownOpen && (
                                        <div className={styles.dropdown}>
                                            {/* User info */}
                                            <div className={styles.dropdownHeader}>
                                                <span className={styles.dropdownEmail}>{user.email}</span>
                                                {isAdmin && (
                                                    <span className={styles.dropdownRole}>OPERATOR</span>
                                                )}
                                            </div>

                                            <div className={styles.dropdownDivider} />

                                            <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                                                DASHBOARD
                                            </Link>
                                            <Link href="/settings" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                                                SETTINGS
                                            </Link>

                                            {isAdmin && (
                                                <>
                                                    <div className={styles.dropdownDivider} />
                                                    <Link href="/monolith" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                                                        🔑 OPS TERMINAL
                                                    </Link>
                                                </>
                                            )}

                                            <div className={styles.dropdownDivider} />
                                            <button
                                                className={styles.dropdownItem}
                                                onClick={() => { logout(); setDropdownOpen(false); }}
                                                style={{ color: '#ff4d6a' }}
                                            >
                                                LOG OUT
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </header>

            {/* Mobile drawer */}
            {mobileOpen && (
                <>
                    <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
                    <nav className={styles.drawer}>
                        {visibleLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`${styles.drawerLink} ${pathname === link.href ? styles.drawerLinkActive : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                                {link.adminOnly && <span className={styles.adminBadge}>🔑</span>}
                            </Link>
                        ))}

                        <div className={styles.drawerDivider} />

                        {!user ? (
                            <>
                                <Link href="/login" className={styles.drawerLink} onClick={() => setMobileOpen(false)}>LOG IN</Link>
                                <Link href="/register" className={styles.drawerLink} onClick={() => setMobileOpen(false)}>SIGN UP</Link>
                            </>
                        ) : (
                            <>
                                <Link href="/settings" className={styles.drawerLink} onClick={() => setMobileOpen(false)}>SETTINGS</Link>
                                <button className={styles.drawerLink} onClick={() => { logout(); setMobileOpen(false); }} style={{ color: '#ff4d6a', background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}>
                                    LOG OUT
                                </button>
                            </>
                        )}

                        {isAdmin && (
                            <div className={styles.drawerOperator}>
                                OPERATOR MODE ACTIVE
                            </div>
                        )}
                    </nav>
                </>
            )}
        </>
    );
}
