'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../legal.module.css';

export default function PrivacyPolicyPage() {
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
                <h1 className={styles.pageTitle}>Privacy Policy</h1>
                <p className={styles.pageSubtitle}>
                    How we handle your data — with transparency and minimal collection.
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
                                W3B (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your privacy.
                                This Privacy Policy describes how we collect, use, and protect information when you use the
                                W3B prediction fund platform, website, and related services.
                            </p>
                            <div className={styles.highlightBox}>
                                <p>
                                    <strong>Our philosophy:</strong> We collect the minimum data necessary to operate the Platform.
                                    We do not use cookies, do not track you across websites, and do not sell your data.
                                </p>
                            </div>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §2 — Data We Collect */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§2</span>
                    <h2 className={styles.sectionTitle}>Data We Collect</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p><strong>Account Data (if you register):</strong></p>
                            <ul>
                                <li>Email address — for login, password recovery, and optional notifications.</li>
                                <li>Password — stored as a cryptographic hash; we never store or see your plaintext password.</li>
                                <li>Account identifier — your unique fund participant ID assigned upon registration.</li>
                            </ul>

                            <p><strong>Transaction Data:</strong></p>
                            <ul>
                                <li>Deposit amounts, withdrawal amounts, and timestamps — recorded in our secure internal systems.</li>
                                <li>Fund position history and returns — tracked for your account dashboard.</li>
                            </ul>

                            <p><strong>Analytics (privacy-respecting):</strong></p>
                            <ul>
                                <li>Anonymous page view counts and aggregated event data.</li>
                                <li>No cookies. No fingerprinting. No personal data is collected by our analytics.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §3 — What We Don't Collect */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§3</span>
                    <h2 className={styles.sectionTitle}>What We Do Not Collect</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <ul>
                                <li>We do not use cookies or tracking pixels.</li>
                                <li>We do not collect personal financial information (bank accounts, credit card numbers).</li>
                                <li>We do not use browser fingerprinting.</li>
                                <li>We do not share, sell, or rent your data to third parties for advertising purposes.</li>
                                <li>We do not track your activity across other websites.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §4 — How We Use Data */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§4</span>
                    <h2 className={styles.sectionTitle}>How We Use Your Data</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>We use the data we collect solely for the following purposes:</p>
                            <ul>
                                <li><strong>Account access</strong> — authenticating your login and managing your session.</li>
                                <li><strong>Fund operations</strong> — processing deposits, withdrawals, and tracking your fund position.</li>
                                <li><strong>Communications</strong> — sending password reset emails, deposit/withdrawal confirmations, and optional weekly reports (only if you opt in).</li>
                                <li><strong>Security</strong> — rate limiting, brute-force protection, and detecting suspicious activity.</li>
                                <li><strong>Product improvement</strong> — anonymized, aggregated analytics to understand usage patterns.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §5 — Data Storage & Security */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§5</span>
                    <h2 className={styles.sectionTitle}>Data Storage &amp; Security</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                All account data is encrypted at rest using AES-256 encryption. Passwords are hashed using bcrypt.
                                Sensitive credentials are encrypted and stored in a secure key management system.
                            </p>
                            <p>
                                We use industry-standard security practices including HTTPS/TLS for all communications,
                                two-factor authentication (optional), and session token rotation.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §6 — Third-Party Services */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§6</span>
                    <h2 className={styles.sectionTitle}>Third-Party Services</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>The Platform integrates with the following third-party services:</p>
                            <ul>
                                <li><strong>Kalshi</strong> — CFTC-regulated exchange for prediction market execution. Subject to Kalshi&apos;s privacy policy.</li>
                                <li><strong>Sports data providers</strong> — aggregated statistics for probability model inputs. No personal data is shared.</li>
                            </ul>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §7 — Your Rights */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§7</span>
                    <h2 className={styles.sectionTitle}>Your Rights</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>You have the right to:</p>
                            <ul>
                                <li><strong>Delete your account</strong> — permanently remove your email and account data from our servers.</li>
                                <li><strong>Export your data</strong> — request a copy of all data we store about you.</li>
                                <li><strong>Correct your data</strong> — update your email or display name at any time via Settings.</li>
                                <li><strong>Opt out of communications</strong> — manage notification preferences in your account Settings.</li>
                            </ul>
                            <p>
                                Account deletion removes all data stored on our servers. Transaction records required for
                                regulatory compliance may be retained for the legally mandated period.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §8 — Children */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§8</span>
                    <h2 className={styles.sectionTitle}>Children&apos;s Privacy</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={styles.prose}>
                            <p>
                                The Platform is not intended for use by individuals under 18 years of age.
                                We do not knowingly collect personal information from children.
                                If we become aware that we have collected data from a minor, we will promptly delete it.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>

                <div className={styles.divider} />

                {/* §9 — Contact */}
                <motion.section className={styles.docSection} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                    <span className={styles.sectionNumber}>§9</span>
                    <h2 className={styles.sectionTitle}>Contact</h2>
                    <HoloPanel size="md" depth="mid">
                        <div className={`${styles.prose} ${styles.contactBlock}`}>
                            <p>
                                For privacy-related inquiries or to exercise your data rights, contact us at{' '}
                                <a href="mailto:support@w3b.finance">support@w3b.finance</a>.
                            </p>
                        </div>
                    </HoloPanel>
                </motion.section>
            </div>
        </PageContainer>
    );
}
