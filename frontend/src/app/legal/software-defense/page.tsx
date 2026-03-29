'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../legal.module.css';

export default function SoftwareDefensePage() {
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
                <h1 className={styles.pageTitle}>Fund Structure &amp; Legal Defense</h1>
                <p className={styles.pageSubtitle}>
                    W3B operates as a quantitative prediction fund — not a financial intermediary, broker, or advisor.
                </p>
            </motion.section>

            {/* ─── Content ─── */}
            <div className={styles.content}>
                <Link href="/docs" className={styles.backLink}>← Back to Documentation</Link>
                <p className={styles.effectiveDate}>Effective Date: March 8, 2026</p>

                {/* §1 — Nature of the Fund */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§1</span>
                    <h2 className={styles.sectionTitle}>Nature of the Fund</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B is a quantitative prediction fund that generates returns by deploying capital into
                                CFTC-regulated event contracts on designated contract markets (Kalshi). The fund
                                uses proprietary probability models to identify mispricings and capture returns.
                            </p>
                            <p>
                                The fund operates under a managed account structure. All positions are placed on
                                regulated exchanges that are subject to CFTC oversight. The fund management team
                                makes all trading decisions based on quantitative model outputs.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §2 — W3B as Fund Operator */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§2</span>
                    <h2 className={styles.sectionTitle}>W3B as Fund Operator</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The team behind W3B operates as the <strong>fund management entity</strong>. Our role is to:
                            </p>
                            <ul>
                                <li><strong>Develop and maintain models.</strong> We build, test, and refine quantitative probability models for predicting event contract outcomes.</li>
                                <li><strong>Execute positions.</strong> We place positions on CFTC-regulated exchanges based on model outputs and risk management rules.</li>
                                <li><strong>Manage risk.</strong> We monitor all positions in real-time with 14 independent circuit breakers, Kelly criterion sizing, and a 60% cash reserve policy.</li>
                                <li><strong>Report performance.</strong> We provide full transparency through the Track Record page, with all positions independently verifiable via the Kalshi Exchange API.</li>
                            </ul>
                            <div className={styles.highlightBox}>
                                <p>
                                    <strong>All trading is conducted on CFTC-regulated exchanges.</strong> Fund capital is held
                                    with regulated counterparties. The fund maintains a 60% cash reserve at all times.
                                </p>
                            </div>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §3 — Fund Governance */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§3</span>
                    <h2 className={styles.sectionTitle}>Fund Governance</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The fund is governed by a multi-party oversight structure:
                            </p>
                            <ul>
                                <li><strong>Fund Manager.</strong> Oversees day-to-day operations, model development, and position execution.</li>
                                <li><strong>Risk Officer.</strong> Monitors risk metrics, circuit breakers, and drawdown limits independently.</li>
                                <li><strong>Compliance Lead.</strong> Ensures regulatory compliance, AML procedures, and reporting obligations are met.</li>
                            </ul>
                            <p>
                                Key parameter changes (risk limits, fee adjustments, strategy modifications) require
                                multi-party approval before implementation.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §4 — No Advisory Role */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§4</span>
                    <h2 className={styles.sectionTitle}>No Advisory Role</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B does not provide financial advice, investment advice, tax advice, or legal advice.
                                The Platform provides access to a managed prediction fund. Participation is at the user&apos;s own discretion.
                            </p>
                            <p>
                                Any performance data, return estimates, risk metrics, or other information displayed on the website
                                is provided strictly for informational and transparency purposes. It should not be construed as
                                a recommendation to invest or take any financial action.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §5 — Transparency */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§5</span>
                    <h2 className={styles.sectionTitle}>Transparency &amp; Verification</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B is committed to full transparency in fund operations:
                            </p>
                            <ul>
                                <li><strong>Independent verification.</strong> All positions are independently verifiable through the Kalshi Exchange API settlement data.</li>
                                <li><strong>Real-time performance.</strong> Fund performance metrics are updated in real-time and accessible on the Performance page.</li>
                                <li><strong>Track Record.</strong> Complete position history with outcomes, P&amp;L, and verification sources available on the Track Record page.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §6 — Regulatory Positioning */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§6</span>
                    <h2 className={styles.sectionTitle}>Regulatory Positioning</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B trades exclusively on Kalshi, a CFTC-regulated Designated Contract Market (DCM).
                                This means:
                            </p>
                            <ul>
                                <li>All event contracts are cleared through a regulated clearinghouse.</li>
                                <li>Kalshi handles all regulatory compliance for exchange operations.</li>
                                <li>No separate sports betting or gambling license is required — Kalshi provides the regulatory framework.</li>
                            </ul>
                            <p>
                                The fund management structure is being reviewed by legal counsel to determine appropriate
                                registrations (e.g., CPO/CTA with NFA) based on fund size and participant count.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §7 — Provided As-Is */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§7</span>
                    <h2 className={styles.sectionTitle}>Provided &ldquo;As-Is&rdquo;</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The Platform is provided <strong>&ldquo;as-is&rdquo;</strong> and <strong>&ldquo;as available&rdquo;</strong>
                                without warranties of any kind, either express or implied, including but not limited to
                                implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
                            </p>
                            <p>
                                The fund employs professional risk management, real-time monitoring, and maintains an
                                Insurance Fund. However, no investment strategy can be guaranteed to be profitable
                                or free of losses.
                            </p>
                            <p>
                                For full liability limitations, see our <Link href="/legal/terms">Terms of Service</Link>.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>
            </div>
        </PageContainer>
    );
}
