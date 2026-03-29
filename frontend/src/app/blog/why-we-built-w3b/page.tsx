'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../blog.module.css';

export default function WhyWeBuiltW3B() {
    return (
        <PageContainer>
            <motion.section className={styles.articleHeader} initial="hidden" animate="visible" variants={fadeInUp}>
                <HoloLabel>VISION</HoloLabel>
                <h1 className={styles.articleTitle}>Why We Built W3B</h1>
                <div className={styles.articleMeta}>
                    <span className={styles.date}>March 2026</span>
                </div>
                <Link href="/blog" className={styles.backLink}>← Back to Blog</Link>
            </motion.section>

            <div className={styles.articleContent}>
                <HoloPanel size="lg" depth="mid">
                    <div className={styles.prose} style={{ padding: '1.5rem' }}>
                        <h2>The Problem</h2>
                        <p>
                            Traditional finance was built to extract value from individual investors. Management fees, performance fees, custody fees, transaction fees — the average person loses 1–2% of their portfolio annually just to intermediaries. And even after paying these fees, <strong>most actively managed funds underperform a simple index</strong>.
                        </p>
                        <p>
                            Many platforms promised to fix this with technology. They didn&apos;t. Instead of eliminating rent-seeking, they created new forms of it: unsustainable incentive programs marketed as &quot;guaranteed returns,&quot; governance structures with no real utility, and models that rely on new deposits to pay old depositors. The fintech era produced some of the most sophisticated fee structures in financial history.
                        </p>

                        <div className={styles.highlightBlock}>
                            <p><strong>The core problem isn&apos;t traditional vs. digital. It&apos;s real returns vs. fabricated returns.</strong></p>
                        </div>

                        <h2>The Thesis</h2>
                        <p>
                            W3B is built on a simple thesis: <strong>quantitative prediction generates real returns</strong>. Not returns from financial engineering. Not returns from new deposits subsidizing old ones. Returns from market intelligence — identifying mispricings in event contracts, sizing positions correctly, and managing risk systematically.
                        </p>
                        <p>
                            Our prediction engine, MONOLITH, is a quantitative system built over 14 research phases covering regime detection, alpha generation, risk management, and execution optimization. It deploys capital into CFTC-regulated event contracts on designated contract markets, capturing returns that are then distributed to fund participants.
                        </p>
                        <p>
                            This is the same business model as a hedge fund — except:
                        </p>
                        <ul>
                            <li><strong>No minimum investment.</strong> Anyone can participate with any amount.</li>
                            <li><strong>No lock-up period.</strong> Withdraw anytime.</li>
                            <li><strong>Transparent performance.</strong> Every position is recorded and independently verifiable through the Kalshi Exchange API.</li>
                            <li><strong>No gatekeepers.</strong> You don&apos;t need to be an accredited investor or know the right people.</li>
                        </ul>

                        <h2>Why Sovereign?</h2>
                        <p>
                            We call it the &quot;Sovereign Vault&quot; because sovereignty means control. Your money, your decision to deposit or withdraw, your ability to verify every position outcome, your access to full performance transparency.
                        </p>
                        <p>
                            There&apos;s no middleman you have to trust. The track record is the proof. The verified returns are the evidence. Full transparency is the standard.
                        </p>

                        <h2>Why Prediction Markets?</h2>
                        <p>
                            We chose CFTC-regulated prediction markets (Kalshi) for three reasons:
                        </p>
                        <ul>
                            <li><strong>Regulated infrastructure.</strong> Kalshi operates as a CFTC-regulated Designated Contract Market — the same regulatory framework as the CME and CBOE.</li>
                            <li><strong>Binary outcomes.</strong> Event contracts resolve definitively — eliminating ambiguity and enabling clean performance measurement.</li>
                            <li><strong>Uncorrelated returns.</strong> Prediction market returns are independent of stock market or bond market performance — providing genuine diversification.</li>
                        </ul>

                        <h2>What We&apos;re Not</h2>
                        <p>
                            We&apos;re not a get-rich-quick scheme. We&apos;re not promising outsized returns. We&apos;re a quantitative prediction fund that generates returns from systematic probability modeling on regulated event markets and shares them with participants. If MONOLITH doesn&apos;t generate profits, the fund doesn&apos;t generate returns. That&apos;s the deal.
                        </p>
                        <p>
                            <strong>Real returns. Full transparency. No games.</strong>
                        </p>

                        <div className={styles.highlightBlock}>
                            <p>Interested? Review our <Link href="/performance">verified performance</Link>, or <Link href="/vault">invest in the fund</Link>.</p>
                        </div>
                    </div>
                </HoloPanel>
            </div>
        </PageContainer>
    );
}
