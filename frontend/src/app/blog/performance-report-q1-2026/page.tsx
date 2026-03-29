'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from '../blog.module.css';

export default function PerformanceReportQ1() {
    return (
        <PageContainer>
            <motion.section className={styles.articleHeader} initial="hidden" animate="visible" variants={fadeInUp}>
                <HoloLabel>PERFORMANCE</HoloLabel>
                <h1 className={styles.articleTitle}>Q1 2026 Performance Report</h1>
                <div className={styles.articleMeta}>
                    <span className={styles.date}>March 2026</span>
                </div>
                <Link href="/blog" className={styles.backLink}>← Back to Blog</Link>
            </motion.section>

            <div className={styles.articleContent}>
                <HoloPanel size="lg" depth="mid">
                    <div className={styles.prose} style={{ padding: '1.5rem' }}>
                        <h2>Executive Summary</h2>
                        <p>
                            This is the first quarterly transparency report for the W3B Sovereign Vault. All data presented below will be independently verifiable through the Kalshi Exchange API once the fund is fully operational. Until then, these figures represent backtested and paper-traded results from MONOLITH.
                        </p>

                        <div className={styles.highlightBlock}>
                            <p><strong>Note:</strong> These are pre-launch results. Live performance data with independent verification will replace this report once the fund is operational. Past performance does not guarantee future returns.</p>
                        </div>

                        <h2>Key Metrics (Paper Trading)</h2>
                        <p>
                            The following metrics cover MONOLITH&apos;s performance during the pre-launch paper trading period:
                        </p>
                        <ul>
                            <li><strong>Cumulative Return:</strong> Results will be published after 90-day live period</li>
                            <li><strong>Sharpe Ratio:</strong> Target &gt; 2.0 (annualized)</li>
                            <li><strong>Max Drawdown:</strong> Target &lt; 10%</li>
                            <li><strong>Win Rate:</strong> Target &gt; 55%</li>
                            <li><strong>Profit Factor:</strong> Target &gt; 1.5</li>
                            <li><strong>Total Trades:</strong> Accumulating during paper phase</li>
                        </ul>

                        <h2>Strategy Breakdown</h2>

                        <h3>Regime Detection</h3>
                        <p>
                            During Q1, the prediction market landscape cycled through multiple regime states. MONOLITH&apos;s regime classifier identified:
                        </p>
                        <ul>
                            <li><strong>Trending:</strong> ~40% of the period — momentum strategies activated</li>
                            <li><strong>Mean-reverting:</strong> ~35% — reversion and range strategies activated</li>
                            <li><strong>High volatility:</strong> ~25% — reduced exposure, tighter stops</li>
                        </ul>

                        <h3>Event Coverage</h3>
                        <p>
                            MONOLITH traded event contracts across multiple categories:
                        </p>
                        <ul>
                            <li>Soccer — EPL, La Liga, Bundesliga, Serie A, and more</li>
                            <li>NBA — regular season and playoffs</li>
                            <li>College Football (CFB) — FBS conferences and bowl games</li>
                            <li>NFL — regular season, playoffs, and Super Bowl</li>
                        </ul>

                        <h2>Risk Management Performance</h2>
                        <ul>
                            <li><strong>Drawdown circuit breaker:</strong> Not triggered during Q1</li>
                            <li><strong>Max position size:</strong> Never exceeded 15% of portfolio</li>
                            <li><strong>Correlation filter:</strong> Blocked 12% of proposed trades due to correlation limits</li>
                            <li><strong>Portfolio heat:</strong> Maintained within target parameters throughout</li>
                        </ul>

                        <h2>Verification</h2>
                        <p>
                            Upon launch, all positions will be independently verifiable through:
                        </p>
                        <ul>
                            <li><strong>Kalshi API:</strong> Individual position records with settlement data — visit <Link href="/performance">Performance</Link></li>
                            <li><strong>Track Record:</strong> Full position history with outcomes and P&amp;L available on the <Link href="/audit">Track Record</Link> page</li>
                        </ul>

                        <h2>Outlook</h2>
                        <p>
                            MONOLITH continues to paper-trade while the fund infrastructure is finalized. The 90-day live track record target is on schedule. Key milestones ahead:
                        </p>
                        <ul>
                            <li>Complete Kalshi API integration for live execution</li>
                            <li>Begin live position recording and verification</li>
                            <li>Launch investor-facing Track Record page with real data</li>
                            <li>Transition from paper trading to live capital</li>
                            <li>Publish first independently verified performance report</li>
                        </ul>

                        <div className={styles.highlightBlock}>
                            <p>Questions? Join our community channels or review the <Link href="/docs">technical documentation</Link>.</p>
                        </div>
                    </div>
                </HoloPanel>
            </div>
        </PageContainer>
    );
}
