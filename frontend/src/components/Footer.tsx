import Link from 'next/link';
import styles from './Footer.module.css';

const NAV_LINKS = [
    { href: '/performance', label: 'Performance' },
    { href: '/security', label: 'Security' },
    { href: '/vault', label: 'Vault' },
    { href: '/audit', label: 'Track Record' },
    { href: '/blog', label: 'Blog' },
    { href: '/docs', label: 'Documentation' },
];

const LEGAL_LINKS = [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/risk', label: 'Risk Disclaimer' },
    { href: '/legal/compliance', label: 'Regulatory Disclosures' },
];

const SOCIAL_LINKS = [
    { href: 'https://x.com/w3b_finance', label: 'X / TWITTER', icon: '𝕏' },
    { href: 'https://discord.gg/w3b', label: 'DISCORD', icon: '◆' },
    { href: 'https://t.me/w3b_finance', label: 'TELEGRAM', icon: '✈' },
    { href: 'https://github.com/w3b-finance', label: 'GITHUB', icon: '⌨' },
];

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerInner}>
                {/* Top section: Logo + columns */}
                <div className={styles.top}>
                    {/* Brand column */}
                    <div className={styles.brand}>
                        <span className={styles.brandLogo}>W3B</span>
                        <p className={styles.brandTagline}>
                            Quantitative Prediction Fund — powered by the MONOLITH engine.
                        </p>
                        <div className={styles.statusRow}>
                            <span className={styles.statusDot} />
                            <span className={styles.statusLabel}>All Systems Operational</span>
                        </div>
                    </div>

                    {/* Nav column */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>FUND</h4>
                        {NAV_LINKS.map((link) => (
                            <Link key={link.label} href={link.href} className={styles.colLink}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Legal column */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>LEGAL</h4>
                        {LEGAL_LINKS.map((link) => (
                            <Link key={link.label} href={link.href} className={styles.colLink}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Social column */}
                    <div className={styles.col}>
                        <h4 className={styles.colTitle}>CONNECT</h4>
                        {SOCIAL_LINKS.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.colLink}
                            >
                                <span className={styles.socialIcon}>{link.icon}</span>
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className={styles.divider} />

                {/* Bottom bar */}
                <div className={styles.bottom}>
                    <span className={styles.copyright}>
                        © {new Date().getFullYear()} W3B Fund. All rights reserved.
                    </span>
                    <span className={styles.version}>POWERED BY W3B FUND v1.0</span>
                </div>
            </div>
        </footer>
    );
}
