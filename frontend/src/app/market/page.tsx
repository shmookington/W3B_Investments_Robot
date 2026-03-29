'use client';

import { useState, useMemo, useEffect } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import styles from './page.module.css';

interface InsightCard {
    id: string;
    category: string;
    title: string;
    summary: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    timestamp: string;
}

const CATEGORIES = ['ALL', 'SOCCER', 'NBA', 'CFB', 'NFL'] as const;

export default function InsightsPage() {
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [insights, setInsights] = useState<InsightCard[]>([]);
    const [loading, setLoading] = useState(true);

    /* ─── Fetch live insights from API ─── */
    useEffect(() => {
        async function fetchInsights() {
            try {
                const res = await fetch('/api/insights');
                if (res.ok) {
                    const json = await res.json();
                    const data = json.data ?? json;
                    if (Array.isArray(data)) {
                        setInsights(data.map((item: InsightCard & { createdAt?: string }) => ({
                            id: item.id ?? String(Math.random()),
                            category: (item.category ?? 'NFL').toUpperCase(),
                            title: item.title ?? 'Untitled',
                            summary: item.summary ?? '',
                            signal: item.signal ?? 'neutral',
                            confidence: item.confidence ?? 50,
                            timestamp: item.timestamp ?? item.createdAt ?? '—',
                        })));
                    }
                }
            } catch {
                // API unavailable — insights stay empty
            }
            setLoading(false);
        }
        fetchInsights();
        const interval = setInterval(fetchInsights, 5 * 60_000); // refresh every 5m
        return () => clearInterval(interval);
    }, []);

    const filtered = useMemo(() =>
        insights.filter(insight => {
            const matchesCategory = activeCategory === 'ALL' || insight.category === activeCategory;
            const matchesSearch = insight.title.toLowerCase().includes(search.toLowerCase()) ||
                insight.summary.toLowerCase().includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
        }), [activeCategory, search, insights]);

    const signalColor = (signal: string) => {
        switch (signal) {
            case 'bullish': return styles.positive;
            case 'bearish': return styles.negative;
            default: return '';
        }
    };

    return (
        <PageContainer>
            {/* ─── Header Bar ─── */}
            <section className={styles.headerBar}>
                <HoloLabel>TODAY&apos;S INSIGHTS</HoloLabel>
                <div className={styles.controls}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search insights..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </section>

            {/* ─── Category Filters ─── */}
            <section style={{ padding: '0 0 24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            padding: '6px 16px',
                            border: '1px solid',
                            borderColor: activeCategory === cat ? 'rgba(0,255,255,0.4)' : 'rgba(224,224,232,0.1)',
                            background: activeCategory === cat ? 'rgba(0,255,255,0.08)' : 'transparent',
                            color: activeCategory === cat ? '#0ff' : 'rgba(224,224,232,0.5)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </section>

            {/* ─── Insight Cards — LIVE from API ─── */}
            <section style={{ display: 'grid', gap: '16px' }}>
                {loading ? (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'rgba(0,240,255,0.4)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '12px',
                    }}>
                        LOADING INSIGHTS…
                    </div>
                ) : filtered.length > 0 ? (
                    filtered.map((insight) => (
                        <HoloPanel key={insight.id} size="sm" depth="mid">
                            <div style={{ padding: '20px 24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.6rem',
                                            letterSpacing: '0.1em',
                                            padding: '3px 8px',
                                            border: '1px solid rgba(0,255,255,0.2)',
                                            color: 'rgba(0,255,255,0.6)',
                                        }}>
                                            {insight.category}
                                        </span>
                                        <span className={signalColor(insight.signal)} style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.6rem',
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                        }}>
                                            {insight.signal}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.6rem',
                                        color: 'rgba(224,224,232,0.3)',
                                    }}>
                                        {insight.timestamp}
                                    </span>
                                </div>
                                <h3 style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '1rem',
                                    color: 'rgba(224,224,232,0.85)',
                                    margin: '0 0 8px',
                                    letterSpacing: '0.03em',
                                }}>
                                    {insight.title}
                                </h3>
                                <p style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.7rem',
                                    color: 'rgba(224,224,232,0.4)',
                                    lineHeight: 1.7,
                                    margin: 0,
                                }}>
                                    {insight.summary}
                                </p>
                                <div style={{
                                    marginTop: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.6rem',
                                        color: 'rgba(224,224,232,0.3)',
                                        letterSpacing: '0.08em',
                                    }}>
                                        MODEL CONFIDENCE
                                    </span>
                                    <div style={{
                                        flex: 1,
                                        maxWidth: 120,
                                        height: 3,
                                        background: 'rgba(0,255,255,0.1)',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${insight.confidence}%`,
                                            height: '100%',
                                            background: 'rgba(0,255,255,0.4)',
                                            borderRadius: 2,
                                        }} />
                                    </div>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.6rem',
                                        color: 'rgba(0,255,255,0.5)',
                                    }}>
                                        {insight.confidence}%
                                    </span>
                                </div>
                            </div>
                        </HoloPanel>
                    ))
                ) : (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'rgba(0,240,255,0.4)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '12px',
                    }}>
                        {search ? 'No insights match your search' : 'Awaiting insight data from engine'}
                    </div>
                )}
            </section>

            {/* ─── Disclaimer ─── */}
            <section style={{
                marginTop: '48px',
                padding: '24px',
                borderTop: '1px solid rgba(224,224,232,0.06)',
                textAlign: 'center',
            }}>
                <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color: 'rgba(224,224,232,0.25)',
                    lineHeight: 1.8,
                    maxWidth: 600,
                    margin: '0 auto',
                }}>
                    These insights are generated by our probability models and are provided for informational purposes only.
                    They do not constitute financial advice or a recommendation to invest. Past model accuracy does not guarantee future results.
                </p>
            </section>
        </PageContainer>
    );
}
