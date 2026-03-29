'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import styles from './page.module.css';

const SIGNERS = [
    { role: 'OPERATOR', label: 'Fund Manager' },
    { role: 'RISK', label: 'Risk Officer' },
    { role: 'COMPLIANCE', label: 'Compliance Lead' },
] as const;

const RISK_ITEMS = [
    {
        title: 'Maximum position size is capped at 6% of fund equity',
        desc: 'No single event contract position can exceed 6% of total fund equity. Exposure limits are enforced automatically by the risk engine before any position is placed.',
    },
    {
        title: '14 independent circuit breakers protect against extreme conditions',
        desc: 'Real-time circuit breakers halt positioning if risk thresholds are breached. The system gracefully de-risks — no human intervention needed.',
    },
    {
        title: 'CFTC-regulated exchange with 60% cash reserve policy',
        desc: 'All positions are placed on Kalshi, a CFTC-regulated Designated Contract Market. A minimum 60% cash reserve ensures capital preservation and withdrawal availability.',
    },
] as const;

type HealthStatus = 'loading' | 'operational' | 'degraded' | 'down';

const STATUS_MAP: Record<HealthStatus, { label: string; color: string; glow: 'green' | 'cyan' }> = {
    loading: { label: 'CHECKING SYSTEMS…', color: 'rgba(0,240,255,0.5)', glow: 'cyan' },
    operational: { label: 'ALL SYSTEMS OPERATIONAL', color: '#00ff41', glow: 'green' },
    degraded: { label: 'DEGRADED PERFORMANCE', color: '#ffb300', glow: 'cyan' },
    down: { label: 'SYSTEMS UNAVAILABLE', color: '#ff3b3b', glow: 'cyan' },
};

export default function SecurityPage() {
    const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading');
    const [lastCheck, setLastCheck] = useState<string>('—');

    useEffect(() => {
        async function checkHealth() {
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    const json = await res.json();
                    const status = json.status ?? json.data?.status ?? 'operational';
                    if (status === 'operational' || status === 'ok' || status === 'healthy') {
                        setHealthStatus('operational');
                    } else if (status === 'degraded' || status === 'warning') {
                        setHealthStatus('degraded');
                    } else {
                        setHealthStatus('down');
                    }
                } else {
                    setHealthStatus('down');
                }
            } catch {
                setHealthStatus('down');
            }
            setLastCheck(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }
        checkHealth();
        const interval = setInterval(checkHealth, 60_000);
        return () => clearInterval(interval);
    }, []);

    const status = STATUS_MAP[healthStatus];

    return (
        <PageContainer>
            {/* ═══════════════════════════════════════════
          PAGE HEADER
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.pageHeader}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <HoloLabel>TRUST & VERIFICATION</HoloLabel>
                <h1 className={styles.pageTitle}>Security</h1>
                <p className={styles.pageSubtitle}>
                    Transparent infrastructure. CFTC-regulated exchange. Independent verification. Here&apos;s the proof we&apos;re safe.
                </p>
            </motion.section>

            {/* ═══════════════════════════════════════════
          SYSTEM STATUS — Live from /api/health
          ═══════════════════════════════════════════ */}
            <motion.div
                className={styles.statusBanner}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <HoloPanel size="sm" depth="foreground" glow={status.glow}>
                    <div className={styles.statusContent}>
                        <div className={styles.statusDot} style={{ backgroundColor: status.color }} />
                        <span className={styles.statusText} style={{ color: status.color }}>{status.label}</span>
                        <span className={styles.statusTimestamp}>
                            LAST CHECK: {lastCheck} UTC
                        </span>
                    </div>
                </HoloPanel>
            </motion.div>

            {/* ═══════════════════════════════════════════
          AUDIT REPORTS
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>AUDIT REPORTS</span>
                <h2 className={styles.sectionTitle}>Independent security audits</h2>

                <div className={styles.auditGrid}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="mid" className={styles.auditCard}>
                            <div className={styles.auditIcon}>
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <path d="M14 3l9 5v7c0 6-4 11.5-9 13-5-1.5-9-7-9-13V8l9-5z" />
                                    <path d="M10 14l3 3 5-5" />
                                </svg>
                            </div>
                            <h3 className={styles.auditTitle}>INFRASTRUCTURE AUDIT</h3>
                            <p className={styles.auditDesc}>
                                Comprehensive review of all trading infrastructure, API integrations, and risk management systems.
                                Zero critical vulnerabilities found.
                            </p>
                            <a href="/api/audit/infrastructure-report?format=pdf" target="_blank" rel="noopener noreferrer" className={styles.auditLink}>
                                VIEW FULL REPORT (PDF) →
                            </a>
                        </HoloPanel>
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="mid" className={styles.auditCard}>
                            <div className={styles.auditIcon}>
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <rect x="4" y="4" width="20" height="20" rx="3" />
                                    <path d="M9 14h10" />
                                    <path d="M9 10h10" />
                                    <path d="M9 18h6" />
                                </svg>
                            </div>
                            <h3 className={styles.auditTitle}>ECONOMIC AUDIT</h3>
                            <p className={styles.auditDesc}>
                                Risk model and fee mechanism review. Validates probability model assumptions, position sizing logic,
                                and fee distribution under adversarial conditions.
                            </p>
                            <a href="/api/audit/economic-report?format=pdf" target="_blank" rel="noopener noreferrer" className={styles.auditLink}>
                                VIEW FULL REPORT (PDF) →
                            </a>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          EXCHANGE & REGULATORY
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>REGULATORY COMPLIANCE</span>
                <h2 className={styles.sectionTitle}>Regulated exchange infrastructure</h2>

                <div className={styles.contractGrid}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.contractCard}>
                            <div className={styles.contractRow}>
                                <span className={styles.contractName}>EXCHANGE</span>
                                <span className={styles.contractAddress}>Kalshi — CFTC-regulated DCM</span>
                            </div>
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.contractCard}>
                            <div className={styles.contractRow}>
                                <span className={styles.contractName}>REGULATOR</span>
                                <span className={styles.contractAddress}>CFTC (Commodity Futures Trading Commission)</span>
                            </div>
                        </HoloPanel>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="sm" depth="mid" className={styles.contractCard}>
                            <div className={styles.contractRow}>
                                <span className={styles.contractName}>MARKET TYPE</span>
                                <span className={styles.contractAddress}>Designated Contract Market (DCM)</span>
                            </div>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          FUND GOVERNANCE
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>GOVERNANCE</span>
                <h2 className={styles.sectionTitle}>Fund management oversight</h2>

                <HoloPanel size="md" depth="foreground">
                    <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                        <p style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.7rem',
                            color: 'rgba(224, 224, 232, 0.4)',
                            lineHeight: 1.8,
                            marginBottom: 'var(--space-5)',
                            maxWidth: 500,
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}>
                            All fund operations require multi-party oversight.
                            No single individual can move funds unilaterally.
                        </p>
                    </div>

                    <div className={styles.signerGrid}>
                        {SIGNERS.map((s) => (
                            <motion.div key={s.role} variants={staggerItem}>
                                <div className={styles.signerCard}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="1.2" style={{ marginBottom: 8 }}>
                                        <rect x="5" y="11" width="14" height="10" rx="2" />
                                        <circle cx="12" cy="8" r="4" />
                                    </svg>
                                    <div className={styles.signerRole}>{s.role}</div>
                                    <div className={styles.signerLabel}>{s.label}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </HoloPanel>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          PROTECTION
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>PROTECTION</span>
                <h2 className={styles.sectionTitle}>Additional safeguards</h2>

                <div className={styles.infoGrid}>
                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="mid" className={styles.infoCard}>
                            <div className={styles.infoIcon}>
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <path d="M14 3l9 5v7c0 6-4 11.5-9 13-5-1.5-9-7-9-13V8l9-5z" />
                                    <circle cx="14" cy="14" r="3" />
                                </svg>
                            </div>
                            <h3 className={styles.infoTitle}>REGULATORY PROTECTION</h3>
                            <p className={styles.infoDesc}>
                                All fund positions are placed on a CFTC-regulated exchange. Fund capital is held with a regulated custodian with FDIC insurance protection up to applicable limits.
                            </p>
                            <span className={`${styles.infoBadge} ${styles.badgeGreen}`}>ACTIVE</span>
                        </HoloPanel>
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <HoloPanel size="md" depth="mid" className={styles.infoCard}>
                            <div className={styles.infoIcon}>
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <circle cx="14" cy="14" r="11" />
                                    <path d="M14 8v4l3 3" />
                                    <path d="M10 20l8-8" />
                                </svg>
                            </div>
                            <h3 className={styles.infoTitle}>REAL-TIME MONITORING</h3>
                            <p className={styles.infoDesc}>
                                24/7 monitoring of all systems with automated alerting. Circuit breakers trigger automatically if anomalies are detected.
                                Kill switch available for immediate position halt.
                            </p>
                            <span className={`${styles.infoBadge} ${styles.badgeCyan}`}>ALWAYS ON</span>
                        </HoloPanel>
                    </motion.div>
                </div>
            </motion.section>

            <div className={styles.divider} />

            {/* ═══════════════════════════════════════════
          RISK MANAGEMENT — Plain English
          ═══════════════════════════════════════════ */}
            <motion.section
                className={styles.section}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <span className={styles.sectionLabel}>RISK MANAGEMENT</span>
                <h2 className={styles.sectionTitle}>How we protect your capital</h2>

                <div className={styles.riskList}>
                    {RISK_ITEMS.map((item, i) => (
                        <motion.div key={i} variants={staggerItem}>
                            <HoloPanel size="sm" depth="mid" className={styles.riskItem}>
                                <div className={styles.riskIcon}>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M7 10l2.5 2.5L13 8" />
                                        <circle cx="10" cy="10" r="8" />
                                    </svg>
                                </div>
                                <div className={styles.riskContent}>
                                    <div className={styles.riskTitle}>{item.title}</div>
                                    <div className={styles.riskDesc}>{item.desc}</div>
                                </div>
                            </HoloPanel>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            {/* ═══════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════ */}
            <section className={styles.ctaSection}>
                <Link href="/vault" className={styles.ctaButton}>
                    VIEW THE VAULT
                </Link>
            </section>
        </PageContainer>
    );
}
