'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { fadeInUp } from '@/lib/motion';
import styles from './blog.module.css';

const POSTS = [
    {
        slug: 'why-we-built-w3b',
        title: 'Why We Built W3B',
        date: 'March 2026',
        tag: 'VISION',
        tagColor: '#0ff',
        excerpt: 'The thesis behind a quantitative prediction fund — why systematic probability models outperform discretionary approaches to event contracts.',
    },
    {
        slug: 'patriot-yield',
        title: 'How the MONOLITH Engine Works',
        date: 'March 2026',
        tag: 'RESEARCH',
        tagColor: '#28ca41',
        excerpt: 'A deep dive into our quantitative prediction engine — MONOLITH — and how it generates returns through systematic edge identification in CFTC-regulated event contracts.',
    },
    {
        slug: 'performance-report-q1-2026',
        title: 'Q1 2026 Performance Report',
        date: 'March 2026',
        tag: 'PERFORMANCE',
        tagColor: '#a855f7',
        excerpt: 'Verified fund performance data, risk metrics, model accuracy, and forward outlook for Q1 2026.',
    },
];

export default function BlogPage() {
    return (
        <PageContainer>
            <motion.section className={styles.hero} initial="hidden" animate="visible" variants={fadeInUp}>
                <HoloLabel>INSIGHTS</HoloLabel>
                <h1 className={styles.heroTitle}>Blog</h1>
                <p className={styles.heroSub}>Research notes, performance updates, and transparency reports from the W3B fund.</p>
            </motion.section>

            <div className={styles.grid}>
                {POSTS.map((post) => (
                    <motion.div key={post.slug} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeInUp}>
                        <Link href={`/blog/${post.slug}`} className={styles.cardLink}>
                            <HoloPanel size="md" depth="mid">
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.tag} style={{ color: post.tagColor, borderColor: post.tagColor }}>{post.tag}</span>
                                        <span className={styles.date}>{post.date}</span>
                                    </div>
                                    <h2 className={styles.cardTitle}>{post.title}</h2>
                                    <p className={styles.cardExcerpt}>{post.excerpt}</p>
                                    <span className={styles.readMore}>Read →</span>
                                </div>
                            </HoloPanel>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </PageContainer>
    );
}
