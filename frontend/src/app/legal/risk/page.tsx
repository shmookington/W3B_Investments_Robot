'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../legal.module.css';

export default function RiskDisclosuresPage() {
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
                <h1 className={styles.pageTitle}>Risk Disclosures</h1>
                <p className={styles.pageSubtitle}>
                    A comprehensive overview of risks associated with using the W3B prediction fund. Read this before investing.
                </p>
            </motion.section>

            {/* ─── Content ─── */}
            <div className={styles.content}>
                <Link href="/docs" className={styles.backLink}>← Back to Documentation</Link>
                <p className={styles.effectiveDate}>Effective Date: March 8, 2026</p>

                {/* Warning Banner */}
                <HoloPanel size="md" depth="foreground">
                    <div className={`${styles.prose} ${styles.highlightBox} ${styles.warningBox}`} style={{ border: 'none', margin: 0 }}>
                        <p>
                            <strong>IMPORTANT: Investing in the W3B prediction fund involves significant financial risk, including
                                the potential loss of your entire deposited capital.</strong> Past performance does not guarantee
                            future results. You should not invest more than you can afford to lose.
                        </p>
                    </div>
                </HoloPanel>

                <div className={styles.divider} />

                {/* §1 — Trading & Market Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§1</span>
                    <h2 className={styles.sectionTitle}>Trading &amp; Market Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The W3B Fund deploys capital into CFTC-regulated event contracts using the MONOLITH
                                quantitative prediction engine. Investing involves inherent risks:
                            </p>
                            <ul>
                                <li><strong>Loss of principal.</strong> Trading strategies may incur losses. While risk management systems limit exposure, capital loss is possible.</li>
                                <li><strong>Volatility.</strong> Event contract markets can experience rapid price movements based on new information and changing probabilities.</li>
                                <li><strong>Black swan events.</strong> Extreme, unforeseen market events (exchange failures, geopolitical events, systemic crises) may cause losses beyond what risk models anticipate.</li>
                                <li><strong>Strategy risk.</strong> Individual trading strategies may underperform or fail. The MONOLITH engine&apos;s past returns are not indicative of future performance.</li>
                                <li><strong>Drawdowns.</strong> The fund may experience extended periods of negative returns before recovering. Maximum drawdown limits are in place but do not guarantee capital preservation.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §2 — Platform Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§2</span>
                    <h2 className={styles.sectionTitle}>Platform Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The Platform relies on exchange infrastructure and API connectivity. Despite rigorous security measures:
                            </p>
                            <ul>
                                <li><strong>Software vulnerabilities.</strong> The platform may contain bugs or vulnerabilities that have not been identified by testing.</li>
                                <li><strong>Exploits.</strong> Malicious actors may discover and exploit vulnerabilities in the platform infrastructure.</li>
                                <li><strong>Infrastructure failures.</strong> Server outages, API disruptions, or connectivity issues could temporarily prevent trading or access to the platform.</li>
                                <li><strong>Exchange dependency.</strong> The fund relies on Kalshi for trade execution. Kalshi outages or changes to their platform could impact fund operations.</li>
                            </ul>
                            <p>
                                The Platform maintains an Insurance Fund and implements multiple redundancy measures to mitigate platform risk.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §3 — Model Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§3</span>
                    <h2 className={styles.sectionTitle}>Model Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The fund relies on quantitative probability models for position-taking decisions:
                            </p>
                            <ul>
                                <li><strong>Model degradation.</strong> Models trained on historical data may become less effective as market conditions change.</li>
                                <li><strong>Overfitting risk.</strong> Backtested performance may not accurately predict future real-world results.</li>
                                <li><strong>Data quality.</strong> Model accuracy depends on the quality and timeliness of input data. Stale or incorrect data can lead to poor positioning.</li>
                                <li><strong>Regime changes.</strong> Structural shifts in event markets may invalidate model assumptions.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §4 — Data Source Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§4</span>
                    <h2 className={styles.sectionTitle}>Data Source Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The Platform relies on multiple sports data providers and the Kalshi API for market data. Data-related risks include:
                            </p>
                            <ul>
                                <li><strong>Data feed failures.</strong> Data providers may experience downtime or deliver stale information.</li>
                                <li><strong>Data inaccuracy.</strong> Incorrect statistics, scores, or market prices could lead to erroneous model outputs.</li>
                                <li><strong>API changes.</strong> Third-party providers may change their APIs, rate limits, or pricing without notice.</li>
                            </ul>
                            <p>
                                The Platform implements data freshness checks and multiple data source redundancy to mitigate these risks.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §5 — Regulatory Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§5</span>
                    <h2 className={styles.sectionTitle}>Regulatory Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The regulatory landscape for prediction markets and event contracts is evolving:
                            </p>
                            <ul>
                                <li><strong>Legal changes.</strong> New laws or regulations may restrict, limit, or prohibit event contract trading in your jurisdiction.</li>
                                <li><strong>Exchange regulation.</strong> Changes to CFTC oversight of Kalshi or similar exchanges could impact fund operations.</li>
                                <li><strong>Tax obligations.</strong> Your participation in the fund may create tax obligations. You are solely responsible for determining and fulfilling your tax requirements.</li>
                                <li><strong>Fund registration.</strong> Future regulations may require additional registrations or compliance procedures.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §6 — Counterparty Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§6</span>
                    <h2 className={styles.sectionTitle}>Counterparty Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The fund holds capital with the following counterparties:
                            </p>
                            <ul>
                                <li><strong>Kalshi</strong> — the primary exchange for event contract trading. Kalshi&apos;s operational or financial failure could impact fund capital held on the exchange.</li>
                                <li><strong>Banking partners</strong> — fund capital not deployed in positions is held with regulated financial institutions.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §7 — Liquidity Risk */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§7</span>
                    <h2 className={styles.sectionTitle}>Liquidity Risk</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <ul>
                                <li><strong>Withdrawal delays.</strong> During periods of high redemption demand or low liquidity, withdrawals may be queued and processed with a delay.</li>
                                <li><strong>Position maturity.</strong> Funds allocated to open event contracts may take up to 24–48 hours to settle, creating temporary illiquidity.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §8 — Not Financial Advice */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§8</span>
                    <h2 className={styles.sectionTitle}>Not Financial Advice</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <div className={styles.highlightBox}>
                                <p>
                                    <strong>Nothing on this website or in the Platform constitutes financial, investment, legal, or
                                        tax advice.</strong> All content is provided for informational purposes only. You should consult
                                    qualified professional advisors before making any financial decisions.
                                </p>
                            </div>
                            <p>
                                The display of returns or performance metrics is for informational and transparency
                                purposes only and should not be construed as a projection or guarantee of future performance.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>
            </div>
        </PageContainer>
    );
}
