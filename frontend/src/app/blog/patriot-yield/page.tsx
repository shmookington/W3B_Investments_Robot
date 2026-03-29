'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../blog.module.css';

export default function PatriotYieldArticle() {
    return (
        <PageContainer>
            <motion.section className={styles.articleHeader} initial="hidden" animate="visible" variants={fadeInUp}>
                <HoloLabel>PRODUCT</HoloLabel>
                <h1 className={styles.articleTitle}>Verified Returns: How the Fund Generates Yield</h1>
                <div className={styles.articleMeta}>
                    <span className={styles.date}>March 2026</span>
                </div>
                <Link href="/blog" className={styles.backLink}>← Back to Blog</Link>
            </motion.section>

            <div className={styles.articleContent}>
                <HoloPanel size="lg" depth="mid">
                    <div className={styles.prose} style={{ padding: '1.5rem' }}>
                        <h2>What Are Verified Returns?</h2>
                        <p>
                            Verified Returns is W3B&apos;s term for <strong>real, market-generated performance</strong> — returns derived from systematic probability modeling on CFTC-regulated event contracts. Every position outcome is independently verifiable through the Kalshi Exchange API.
                        </p>

                        <div className={styles.highlightBlock}>
                            <p><strong>Real returns = Trading profits from MONOLITH&apos;s quantitative probability models, distributed to fund participants proportionally.</strong></p>
                        </div>

                        <h2>The Engine: MONOLITH</h2>
                        <p>
                            MONOLITH is a multi-strategy quantitative prediction system developed through 14 research phases. It operates continuously, deploying capital into CFTC-regulated event contracts on designated contract markets. Here&apos;s how the architecture breaks down:
                        </p>

                        <h3>1. Regime Detection</h3>
                        <p>
                            Markets behave differently across conditions. MONOLITH uses a Hidden Markov Model and volatility regime classifier to identify the current environment. This determines which sub-strategies are activated and how capital is allocated.
                        </p>

                        <h3>2. Alpha Generation</h3>
                        <p>
                            Multiple independent probability signals are computed in parallel — momentum, mean-reversion, cross-event correlation, and closing line value analysis. Each signal has been backtested across extensive historical data spanning multiple market cycles.
                        </p>

                        <h3>3. Risk Management</h3>
                        <p>
                            Before any position is taken, it passes through the risk engine:
                        </p>
                        <ul>
                            <li><strong>Position sizing:</strong> Kelly Criterion-derived, capped at conservative limits</li>
                            <li><strong>Portfolio heat:</strong> Maximum portfolio risk never exceeds defined thresholds</li>
                            <li><strong>Drawdown circuit breaker:</strong> If drawdown exceeds limits, all positions are closed and the system pauses</li>
                            <li><strong>Correlation filter:</strong> Prevents concentrated exposure to correlated events</li>
                        </ul>

                        <h3>4. Execution</h3>
                        <p>
                            Positions are placed on CFTC-regulated designated contract markets. The system monitors fill rates and execution quality in real-time, adjusting parameters dynamically to minimize market impact.
                        </p>

                        <h2>The Flow: Invest → Predict → Earn</h2>
                        <p>
                            Here&apos;s what happens when you invest in the W3B Fund:
                        </p>
                        <ol>
                            <li><strong>Deposit USD</strong> into your W3B fund account.</li>
                            <li>Your deposit is added to the <strong>fund capital reserve</strong>, which MONOLITH uses to take positions.</li>
                            <li>MONOLITH deploys capital into event contracts based on quantitative probability models.</li>
                            <li>Profits are credited to the fund&apos;s NAV (Net Asset Value). Your share grows proportionally.</li>
                            <li>Withdraw anytime — no lock-up, 0% withdrawal fee.</li>
                        </ol>

                        <h2>What Makes It Different?</h2>

                        <h3>vs. Traditional Investment Funds</h3>
                        <p>
                            Traditional funds charge 2% management + 20% performance fees, require $100K+ minimums, and lock your money for 1–3 years. W3B charges 0% management fee with a 20% performance fee only on profits above the high-water mark. No minimum deposit, and withdrawals process within 1–2 business days.
                        </p>

                        <h3>vs. Passive Index Investing</h3>
                        <p>
                            Index funds track market benchmarks and deliver market-average returns. MONOLITH&apos;s returns are uncorrelated with equity markets because they are derived from event contract outcomes, not stock prices. This provides genuine diversification.
                        </p>

                        <h3>vs. Discretionary Trading</h3>
                        <p>
                            Human traders are subject to emotional bias, inconsistent execution, and fatigue. MONOLITH operates systematically — every position is sized by Kelly Criterion, filtered through risk controls, and executed without emotion.
                        </p>

                        <h2>Risks</h2>
                        <p>
                            We&apos;re honest about risks:
                        </p>
                        <ul>
                            <li><strong>Model risk.</strong> MONOLITH can have losing periods. Drawdowns happen.</li>
                            <li><strong>Platform risk.</strong> Despite rigorous testing, software vulnerabilities can exist.</li>
                            <li><strong>Regulatory risk.</strong> The event contract regulatory landscape is evolving.</li>
                            <li><strong>Market risk.</strong> Extreme conditions can cause significant losses.</li>
                        </ul>
                        <p>
                            Read our full <Link href="/legal/risk">Risk Disclosures</Link> before investing.
                        </p>

                        <div className={styles.highlightBlock}>
                            <p><strong>Verified Returns isn&apos;t a promise. It&apos;s a mechanism.</strong> The fund generates returns when MONOLITH&apos;s probability models are correct. No hidden subsidies, no financial magic. Just systematic, quantitative prediction.</p>
                        </div>
                    </div>
                </HoloPanel>
            </div>
        </PageContainer>
    );
}
