'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../legal.module.css';

export default function TokenDisclaimerPage() {
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
                <h1 className={styles.pageTitle}>Fund Participation Disclaimer</h1>
                <p className={styles.pageSubtitle}>
                    Legal classification and nature of participation in the W3B prediction fund.
                </p>
            </motion.section>

            {/* ─── Content ─── */}
            <div className={styles.content}>
                <Link href="/docs" className={styles.backLink}>← Back to Documentation</Link>
                <p className={styles.effectiveDate}>Effective Date: March 8, 2026</p>

                {/* Banner */}
                <HoloPanel size="md" depth="foreground">
                    <div className={styles.highlightBox} style={{ border: 'none', margin: 0 }}>
                        <div className={styles.prose}>
                            <p>
                                <strong>Fund participation is not a security, investment contract, share of equity,
                                    or financial instrument of any kind.</strong> Participation in the W3B prediction fund
                                does not guarantee returns, dividends, or profit distributions.
                            </p>
                        </div>
                    </div>
                </HoloPanel>

                <div className={styles.divider} />

                {/* §1 — Classification */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§1</span>
                    <h2 className={styles.sectionTitle}>Fund Classification</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                W3B operates as a <strong>quantitative prediction fund</strong> that generates returns
                                through CFTC-regulated event contracts. Participation represents a share in the
                                fund&apos;s performance, not ownership in any legal entity.
                            </p>
                            <p>
                                The fund exists to provide access to institutional-quality quantitative prediction
                                strategies. Returns are generated solely from trading activity on regulated exchanges.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §2 — Fund Structure */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§2</span>
                    <h2 className={styles.sectionTitle}>Fund Structure</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>The W3B prediction fund operates as follows:</p>
                            <ul>
                                <li><strong>Capital deployment.</strong> Deposited capital is deployed into CFTC-regulated event contracts through the MONOLITH prediction engine.</li>
                                <li><strong>Performance tracking.</strong> Fund performance is tracked through NAV (Net Asset Value) calculations updated in real-time.</li>
                                <li><strong>Proportional returns.</strong> Returns (positive or negative) are distributed proportionally based on each participant&apos;s share of the fund.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §3 — No Guarantee of Returns */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§3</span>
                    <h2 className={styles.sectionTitle}>No Guarantee of Returns</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <div className={`${styles.highlightBox} ${styles.warningBox}`}>
                                <p>
                                    <strong>Fund returns are not guaranteed.</strong> The fund may experience losses,
                                    and you may lose some or all of your deposited capital. Past performance does
                                    not guarantee future results.
                                </p>
                            </div>
                            <p>
                                Returns are generated solely from the trading performance of the MONOLITH prediction
                                engine. During periods of poor model performance, the fund will experience negative returns.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §4 — Regulatory Notice */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§4</span>
                    <h2 className={styles.sectionTitle}>Regulatory Notice</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The legal classification of prediction fund participation varies by jurisdiction.
                                Regulatory authorities in your jurisdiction may classify participation differently.
                            </p>
                            <p>
                                You are solely responsible for determining whether your participation in the W3B
                                prediction fund complies with the laws and regulations of your jurisdiction.
                            </p>
                            <p>
                                W3B fund participation has not been registered under the Securities Act of 1933, the securities laws of any
                                U.S. state, or the securities laws of any other jurisdiction. The fund manager is
                                evaluating appropriate registrations (e.g., CPO/CTA with NFA) as the fund grows.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §5 — Participation Risks */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§5</span>
                    <h2 className={styles.sectionTitle}>Participation Risks</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <ul>
                                <li><strong>Capital loss.</strong> You may lose all of your deposited capital. There is no floor or capital protection mechanism.</li>
                                <li><strong>Withdrawal delays.</strong> During periods of high redemption demand, withdrawals may be queued.</li>
                                <li><strong>Regulatory changes.</strong> Future regulations may restrict or prohibit participation in prediction funds.</li>
                                <li><strong>Counterparty risk.</strong> The fund relies on regulated exchanges (Kalshi) for trade execution. Exchange failures could impact fund capital.</li>
                            </ul>
                            <p>
                                For a comprehensive overview of all risks, see our{' '}
                                <Link href="/legal/risk">Risk Disclosures</Link>.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>
            </div>
        </PageContainer>
    );
}
