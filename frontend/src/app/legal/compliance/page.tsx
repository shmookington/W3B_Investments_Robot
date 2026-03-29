'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../legal.module.css';

export default function CompliancePage() {
    return (
        <PageContainer>
            {/* ─── Header ─── */}
            <motion.section
                className={styles.pageHeader}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <HoloLabel>LEGAL</HoloLabel>
                <h1 className={styles.pageTitle}>Compliance Procedures</h1>
                <p className={styles.pageSubtitle}>
                    How W3B implements regulatory compliance — identity verification, sanctions screening, and transaction monitoring.
                </p>
            </motion.section>

            {/* ─── Content ─── */}
            <div className={styles.content}>
                <Link href="/docs" className={styles.backLink}>← Back to Documentation</Link>
                <p className={styles.effectiveDate}>Effective Date: March 8, 2026</p>

                {/* §1 — Overview */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§1</span>
                    <h2 className={styles.sectionTitle}>Overview</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B implements a multi-layered compliance framework designed to satisfy
                                regulatory requirements while preserving user privacy. Our approach combines:
                            </p>
                            <ul>
                                <li><strong>Identity Verification</strong> — age and jurisdiction verification for fund participants</li>
                                <li><strong>OFAC Sanctions Screening</strong> — automated screening against the SDN list</li>
                                <li><strong>Account Risk Assessment</strong> — behavioral analysis and risk scoring</li>
                                <li><strong>AML Transaction Monitoring</strong> — real-time detection of suspicious patterns</li>
                                <li><strong>Geographic Restrictions</strong> — compliance with jurisdictional sanctions</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §2 — Identity Verification */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§2</span>
                    <h2 className={styles.sectionTitle}>Identity Verification (KYC)</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B uses identity verification to confirm participant eligibility. This ensures
                                all fund participants meet age and jurisdiction requirements.
                            </p>
                            <h3>How It Works</h3>
                            <ol>
                                <li><strong>Registration.</strong> Create an account with your email address.</li>
                                <li><strong>Verification Request.</strong> Complete identity verification through our secure verification partner.</li>
                                <li><strong>Confirmation.</strong> Once verified, your account is marked as eligible. W3B stores only a verification status — no personal documents are retained.</li>
                            </ol>
                            <h3>Required Claims</h3>
                            <ul>
                                <li><strong>Age Verification</strong> — must be 18 years or older</li>
                                <li><strong>Jurisdiction</strong> — must not reside in a sanctioned country</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §3 — OFAC Sanctions Screening */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§3</span>
                    <h2 className={styles.sectionTitle}>OFAC Sanctions Screening</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                Every account that interacts with the Platform is screened against the
                                U.S. Treasury&apos;s Office of Foreign Assets Control (OFAC) Specially Designated Nationals
                                (SDN) list.
                            </p>
                            <h3>Screening Process</h3>
                            <ul>
                                <li><strong>SDN List.</strong> A regularly updated list of sanctioned individuals and entities.</li>
                                <li><strong>Real-Time Screening.</strong> Automated screening at registration and periodically during account activity.</li>
                            </ul>
                            <h3>Actions Taken</h3>
                            <ul>
                                <li>Sanctioned individuals are <strong>immediately blocked</strong> from all Platform interactions.</li>
                                <li>All screening results are logged in an immutable compliance audit trail.</li>
                                <li>False positives can be appealed via <Link href="mailto:compliance@w3b.finance">compliance@w3b.finance</Link>.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §4 — Account Risk Assessment */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§4</span>
                    <h2 className={styles.sectionTitle}>Account Risk Assessment</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                Beyond sanctions screening, accounts are assessed for risk using
                                behavioral analysis and transaction patterns.
                            </p>
                            <h3>Risk Levels</h3>
                            <ul>
                                <li><strong>Low</strong> (0–25) — normal activity, no restrictions</li>
                                <li><strong>Medium</strong> (26–50) — minor flags, activity allowed with monitoring</li>
                                <li><strong>High</strong> (51–75) — significant risk indicators, transactions blocked pending review</li>
                                <li><strong>Severe</strong> (76–100) — confirmed illicit activity, account permanently blocked</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §5 — AML Transaction Monitoring */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§5</span>
                    <h2 className={styles.sectionTitle}>AML Transaction Monitoring</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                All deposit and withdrawal transactions are monitored in real-time for suspicious
                                patterns as required by anti-money laundering (AML) regulations.
                            </p>
                            <h3>Detection Rules</h3>
                            <ul>
                                <li><strong>CTR Threshold.</strong> Single transactions of $10,000 or more trigger a Currency Transaction Report flag.</li>
                                <li><strong>Structuring Detection.</strong> Multiple transactions aggregating above $10,000 within a 24-hour period while individual amounts stay below the threshold.</li>
                                <li><strong>Rapid Cycling.</strong> Deposits followed by near-equivalent withdrawals within 30 minutes — a common layering technique.</li>
                                <li><strong>Velocity Spikes.</strong> More than 10 transactions in a 1-hour rolling window.</li>
                                <li><strong>Suspicious Amounts.</strong> Transactions at known structuring amounts (e.g., $9,000, $9,500, $9,900).</li>
                            </ul>
                            <h3>Alert Handling</h3>
                            <ul>
                                <li><strong>Info</strong> — logged, no action required</li>
                                <li><strong>Warning</strong> — flagged for compliance team review</li>
                                <li><strong>Critical</strong> — transaction held pending manual review; may be reported to FinCEN if warranted</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §6 — Geographic Restrictions */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§6</span>
                    <h2 className={styles.sectionTitle}>Geographic Restrictions</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B implements IP-based geo-fencing to comply with U.S. sanctions programs.
                                Access is blocked from the following jurisdictions:
                            </p>
                            <ul>
                                <li><strong>Cuba</strong> (CU) — OFAC comprehensive sanctions</li>
                                <li><strong>Iran</strong> (IR) — OFAC comprehensive sanctions</li>
                                <li><strong>North Korea</strong> (KP) — OFAC comprehensive sanctions</li>
                                <li><strong>Syria</strong> (SY) — OFAC comprehensive sanctions</li>
                            </ul>
                            <p>
                                Additionally, access from Russia, Belarus, Myanmar, Venezuela, Sudan, Somalia, Yemen,
                                and Libya is subject to enhanced monitoring due to partial sanctions or elevated risk.
                            </p>
                            <p>
                                Geo-fencing uses CDN-level headers (Cloudflare, Vercel) for country detection.
                                Requests from sanctioned countries receive HTTP 451 (Unavailable for Legal Reasons).
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §7 — Suspicious Activity Reporting */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§7</span>
                    <h2 className={styles.sectionTitle}>Suspicious Activity Reporting</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                When suspicious activity is detected, the Platform follows a structured review process:
                            </p>
                            <ol>
                                <li><strong>Automated Detection.</strong> The transaction monitoring system flags the activity and creates a compliance alert.</li>
                                <li><strong>Manual Review.</strong> A compliance officer reviews the alert, verifying whether the activity is genuinely suspicious or a false positive.</li>
                                <li><strong>Escalation.</strong> If confirmed suspicious, a Suspicious Activity Report (SAR) is filed with FinCEN within the required timeframe.</li>
                                <li><strong>Action.</strong> Depending on severity, the user&apos;s account may be restricted pending investigation.</li>
                            </ol>
                            <p>
                                All compliance alerts and actions are recorded in an immutable audit trail with timestamps
                                and reviewer information.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §8 — Data Retention */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§8</span>
                    <h2 className={styles.sectionTitle}>Data Retention &amp; Privacy</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                Compliance data is retained in accordance with BSA/AML requirements:
                            </p>
                            <ul>
                                <li><strong>Compliance checks</strong> — retained for 5 years from the date of the check</li>
                                <li><strong>Compliance alerts</strong> — retained for 5 years from the date of resolution</li>
                                <li><strong>SARs</strong> — retained for 5 years from filing date</li>
                                <li><strong>Identity verification status</strong> — stored as a boolean only; no personal documents are collected or retained by W3B</li>
                            </ul>
                            <p>
                                For details on data collection and privacy practices, see our{' '}
                                <Link href="/legal/privacy">Privacy Policy</Link>.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §9 — Contact */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§9</span>
                    <h2 className={styles.sectionTitle}>Compliance Contact</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                For compliance inquiries, false positive appeals, or to report suspicious activity:
                            </p>
                            <ul>
                                <li><strong>Email:</strong> <Link href="mailto:compliance@w3b.finance">compliance@w3b.finance</Link></li>
                                <li><strong>Response time:</strong> 48 hours for compliance inquiries, 24 hours for urgent matters</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>
            </div>
        </PageContainer>
    );
}
