'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import styles from './page.module.css';

/* ─── Sidebar sections ─── */
const NAV_ITEMS = [
    { id: 'getting-started', label: 'GETTING STARTED' },
    { id: 'how-it-works', label: 'HOW IT WORKS' },
    { id: 'fees', label: 'FEE STRUCTURE' },
    { id: 'faq', label: 'FAQ' },
    { id: 'glossary', label: 'GLOSSARY' },
    { id: 'risk', label: 'RISK DISCLOSURE' },
    { id: 'contact', label: 'CONTACT' },
] as const;

/* ─── FAQ data ─── */
const FAQ_DATA = [
    {
        q: 'What is the minimum deposit?',
        a: 'There is no minimum deposit. You can invest any amount into the fund.',
    },
    {
        q: 'Can I withdraw at any time?',
        a: 'Yes. The fund has no lock-up periods or withdrawal penalties. Your funds are available whenever you need them, subject to normal settlement cycles.',
    },
    {
        q: 'How are returns generated?',
        a: 'The fund uses proprietary probability models to identify mispricings in CFTC-regulated event contracts. Returns are generated from systematic statistical edge, not speculation or token emissions.',
    },
    {
        q: 'Is my deposit insured?',
        a: 'Fund capital is held with a regulated custodian. However, trading losses are not insured — past performance does not guarantee future results.',
    },
    {
        q: 'What exchange are positions placed on?',
        a: 'All positions are placed on a CFTC-regulated Designated Contract Market (DCM). This ensures full regulatory compliance and transparent settlement.',
    },
    {
        q: 'Who controls the fund?',
        a: 'The fund is managed by a team of quantitative analysts with multi-party oversight. No single individual can move funds unilaterally. See our Security page for details.',
    },
] as const;

/* ─── Glossary ─── */
const GLOSSARY = [
    { term: 'NAV', def: 'Net Asset Value — the current total value of the fund, including all positions and cash reserves.' },
    { term: 'Event Contract', def: 'A CFTC-regulated contract that pays out based on the outcome of a specified event.' },
    { term: 'Sharpe Ratio', def: 'A measure of risk-adjusted return. Higher is better. Above 1.5 is considered strong.' },
    { term: 'Max Drawdown', def: 'The largest peak-to-trough decline. Shows the worst loss before recovery.' },
    { term: 'CLV', def: 'Closing Line Value — measures the difference between our entry price and the final market price. Positive CLV proves systematic edge.' },
    { term: 'High-Water Mark', def: 'The highest NAV ever reached. Performance fees are only charged on new profits above this level.' },
    { term: 'Kelly Criterion', def: 'A mathematical formula for optimal position sizing based on edge and probability. We use fractional Kelly for conservative sizing.' },
    { term: 'Circuit Breaker', def: 'An automatic safety mechanism that halts positioning when risk thresholds are breached.' },
] as const;

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('getting-started');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const scrollTo = useCallback((id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const toggleFaq = useCallback((index: number) => {
        setOpenFaq((prev) => (prev === index ? null : index));
    }, []);

    return (
        <PageContainer>
            {/* ─── Page Header ─── */}
            <motion.section
                className={styles.pageHeader}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
            >
                <HoloLabel>KNOWLEDGE BASE</HoloLabel>
                <h1 className={styles.pageTitle}>Documentation</h1>
                <p className={styles.pageSubtitle}>
                    Everything you need to know about the W3B fund, from depositing to risk management.
                </p>
            </motion.section>

            {/* ─── Layout: Sidebar + Content ─── */}
            <div className={styles.layout}>
                {/* ─── Sidebar ─── */}
                <aside className={styles.sidebar}>
                    <HoloPanel size="sm" depth="mid">
                        <nav className={styles.sidebarNav}>
                            {NAV_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    className={`${styles.sidebarLink} ${activeSection === item.id ? styles.sidebarLinkActive : ''}`}
                                    onClick={() => scrollTo(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </HoloPanel>
                </aside>

                {/* ─── Content ─── */}
                <main className={styles.content}>

                    {/* ═══ GETTING STARTED ═══ */}
                    <motion.section
                        id="getting-started"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                    >
                        <span className={styles.sectionLabel}>01</span>
                        <h2 className={styles.sectionTitle}>Getting started</h2>
                        <HoloPanel size="md" depth="mid">
                            <div className={styles.docBody}>
                                <p>
                                    The W3B fund lets you invest capital and earn returns through
                                    quantitative probability models applied to CFTC-regulated prediction markets. No manual trading required — just invest and let the models work.
                                </p>
                            </div>
                            <div className={styles.stepsList}>
                                <motion.div variants={staggerItem}>
                                    <HoloPanel size="sm" depth="background" className={styles.stepItem}>
                                        <span className={styles.stepNum}>01</span>
                                        <span className={styles.stepText}>
                                            <strong>Create a fund account.</strong> Register with your email and complete identity verification.
                                        </span>
                                    </HoloPanel>
                                </motion.div>
                                <motion.div variants={staggerItem}>
                                    <HoloPanel size="sm" depth="background" className={styles.stepItem}>
                                        <span className={styles.stepNum}>02</span>
                                        <span className={styles.stepText}>
                                            <strong>Fund your account.</strong> Transfer USD to your fund account via bank transfer,
                                            wire, or supported payment methods.
                                        </span>
                                    </HoloPanel>
                                </motion.div>
                                <motion.div variants={staggerItem}>
                                    <HoloPanel size="sm" depth="background" className={styles.stepItem}>
                                        <span className={styles.stepNum}>03</span>
                                        <span className={styles.stepText}>
                                            <strong>Deposit into the fund.</strong> Go to the Vault page,
                                            enter an amount, review the risk disclosure, and confirm.
                                        </span>
                                    </HoloPanel>
                                </motion.div>
                                <motion.div variants={staggerItem}>
                                    <HoloPanel size="sm" depth="background" className={styles.stepItem}>
                                        <span className={styles.stepNum}>04</span>
                                        <span className={styles.stepText}>
                                            <strong>Earn returns automatically.</strong> Your capital is deployed by our probability models immediately.
                                            Returns accrue to your balance. Withdraw anytime.
                                        </span>
                                    </HoloPanel>
                                </motion.div>
                            </div>
                        </HoloPanel>
                    </motion.section>

                    <div className={styles.divider} />

                    {/* ═══ HOW IT WORKS ═══ */}
                    <motion.section
                        id="how-it-works"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={fadeInUp}
                    >
                        <span className={styles.sectionLabel}>02</span>
                        <h2 className={styles.sectionTitle}>How the fund works</h2>
                        <HoloPanel size="md" depth="mid">
                            <div className={styles.docBody}>
                                <p>
                                    The W3B fund pools depositor capital and deploys it using proprietary probability models
                                    to identify mispricings in CFTC-regulated event contracts. Each model operates on independent
                                    signal sources to ensure diversification.
                                </p>
                                <p>
                                    <strong>Statistical Edge.</strong> Our models consistently demonstrate positive Closing Line Value (CLV),
                                    proving systematic informational advantage. We don&apos;t trade on hunches — every position is backed by quantitative analysis.
                                </p>
                                <p>
                                    <strong>Risk management.</strong> Every position is subject to strict sizing limits (fractional Kelly criterion),
                                    14 independent circuit breakers, and a 60% cash reserve policy. If risk thresholds are breached, the system
                                    automatically de-risks.
                                </p>
                                <p>
                                    <strong>Transparency.</strong> Aggregate vault performance is publicly visible on the
                                    Performance page. You can see total returns, risk metrics, and monthly breakdowns at any time.
                                </p>
                                <p>
                                    <strong>No position details disclosed.</strong> To protect the competitive edge of the
                                    probability models, individual position details, signals, and model parameters are not shared publicly.
                                </p>
                            </div>
                        </HoloPanel>
                    </motion.section>

                    <div className={styles.divider} />

                    {/* ═══ FEE STRUCTURE ═══ */}
                    <motion.section
                        id="fees"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={fadeInUp}
                    >
                        <span className={styles.sectionLabel}>03</span>
                        <h2 className={styles.sectionTitle}>Fee structure</h2>
                        <HoloPanel size="md" depth="mid">
                            <div className={styles.docBody}>
                                <p>
                                    W3B charges a simple, transparent fee structure aligned with your success.
                                    You only pay when the fund makes you money.
                                </p>
                            </div>
                            <table className={styles.feeTable}>
                                <thead>
                                    <tr>
                                        <th>FEE TYPE</th>
                                        <th>RATE</th>
                                        <th>DESCRIPTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Deposit Fee</td>
                                        <td className={styles.feeHighlight}>0%</td>
                                        <td>No cost to deposit into the vault</td>
                                    </tr>
                                    <tr>
                                        <td>Withdrawal Fee</td>
                                        <td className={styles.feeHighlight}>0%</td>
                                        <td>No cost to withdraw from the vault</td>
                                    </tr>
                                    <tr>
                                        <td>Management Fee</td>
                                        <td className={styles.feeHighlight}>0%</td>
                                        <td>No management fee</td>
                                    </tr>
                                    <tr>
                                        <td>Performance Fee</td>
                                        <td>20%</td>
                                        <td>On profits above the high-water mark</td>
                                    </tr>
                                </tbody>
                            </table>
                        </HoloPanel>
                    </motion.section>

                    <div className={styles.divider} />

                    {/* ═══ FAQ ═══ */}
                    <motion.section
                        id="faq"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={fadeInUp}
                    >
                        <span className={styles.sectionLabel}>04</span>
                        <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
                        <div className={styles.faqList}>
                            {FAQ_DATA.map((faq, i) => (
                                <HoloPanel key={i} size="sm" depth="mid" className={styles.faqItem}>
                                    <button
                                        className={styles.faqQuestion}
                                        onClick={() => toggleFaq(i)}
                                        aria-expanded={openFaq === i}
                                    >
                                        {faq.q}
                                        <span className={`${styles.faqChevron} ${openFaq === i ? styles.faqChevronOpen : ''}`}>
                                            ▾
                                        </span>
                                    </button>
                                    {openFaq === i && (
                                        <div className={styles.faqAnswer}>{faq.a}</div>
                                    )}
                                </HoloPanel>
                            ))}
                        </div>
                    </motion.section>

                    <div className={styles.divider} />

                    {/* ═══ GLOSSARY ═══ */}
                    <motion.section
                        id="glossary"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                    >
                        <span className={styles.sectionLabel}>05</span>
                        <h2 className={styles.sectionTitle}>Glossary</h2>
                        <div className={styles.glossaryGrid}>
                            {GLOSSARY.map((item) => (
                                <motion.div key={item.term} variants={staggerItem}>
                                    <HoloPanel size="sm" depth="mid" className={styles.glossaryCard}>
                                        <div className={styles.glossaryTerm}>{item.term}</div>
                                        <div className={styles.glossaryDef}>{item.def}</div>
                                    </HoloPanel>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                    <div className={styles.divider} />

                    {/* ═══ RISK DISCLOSURE ═══ */}
                    <motion.section
                        id="risk"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={fadeInUp}
                    >
                        <span className={styles.sectionLabel}>06</span>
                        <h2 className={styles.sectionTitle}>Risk disclosure</h2>
                        <HoloPanel size="md" depth="mid">
                            <div className={styles.docBody}>
                                <p>
                                    <strong>Past performance does not guarantee future results.</strong> The W3B fund deploys
                                    capital into CFTC-regulated event contracts. While risk management systems are in place, there is
                                    always the possibility of loss, including loss of principal.
                                </p>
                                <p>
                                    <strong>Platform risk.</strong> The fund depends on exchange infrastructure and API connectivity.
                                    While redundancy measures are in place, platform outages could temporarily affect operations.
                                </p>
                                <p>
                                    <strong>Model risk.</strong> Probability models may underperform during unusual market conditions,
                                    rapid regime changes, or events outside historical training data.
                                </p>
                                <p>
                                    <strong>Regulatory risk.</strong> The regulatory landscape for event contracts is evolving.
                                    Changes in law or regulation could impact the operation or availability of the fund.
                                </p>
                                <p>
                                    <strong>Not financial advice.</strong> Nothing on this site constitutes financial, investment,
                                    legal, or tax advice. You should consult professional advisors before making any financial decisions.
                                </p>
                            </div>
                        </HoloPanel>
                    </motion.section>

                    <div className={styles.divider} />

                    {/* ═══ CONTACT ═══ */}
                    <motion.section
                        id="contact"
                        className={styles.docSection}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                    >
                        <span className={styles.sectionLabel}>07</span>
                        <h2 className={styles.sectionTitle}>Contact &amp; support</h2>
                        <div className={styles.contactGrid}>
                            <motion.div variants={staggerItem}>
                                <HoloPanel size="sm" depth="mid" className={styles.contactCard}>
                                    <div className={styles.contactIcon}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                            <path d="M22 6l-10 7L2 6" />
                                        </svg>
                                    </div>
                                    <div className={styles.contactLabel}>EMAIL</div>
                                    <a href="mailto:support@w3b.finance" className={styles.contactValue}>support@w3b.finance</a>
                                </HoloPanel>
                            </motion.div>
                            <motion.div variants={staggerItem}>
                                <HoloPanel size="sm" depth="mid" className={styles.contactCard}>
                                    <div className={styles.contactIcon}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M8.5 12.5c1.5 2 5 2 6.5 0" />
                                            <path d="M9 9h.01" />
                                            <path d="M15 9h.01" />
                                        </svg>
                                    </div>
                                    <div className={styles.contactLabel}>DISCORD</div>
                                    <a href="https://discord.gg/w3b" target="_blank" rel="noopener noreferrer" className={styles.contactValue}>discord.gg/w3b</a>
                                </HoloPanel>
                            </motion.div>
                            <motion.div variants={staggerItem}>
                                <HoloPanel size="sm" depth="mid" className={styles.contactCard}>
                                    <div className={styles.contactIcon}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                            <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 12 7.5v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                                        </svg>
                                    </div>
                                    <div className={styles.contactLabel}>TWITTER</div>
                                    <a href="https://twitter.com/w3bfinance" target="_blank" rel="noopener noreferrer" className={styles.contactValue}>@w3bfinance</a>
                                </HoloPanel>
                            </motion.div>
                        </div>
                    </motion.section>
                </main>
            </div>
        </PageContainer>
    );
}
