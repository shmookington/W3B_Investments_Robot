'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HoloLabel } from '@/components/HoloText';
import { HoloPanel } from '@/components/HoloPanel';
import { PageContainer } from '@/components/Layout';
import { MonolithHero } from '@/components/MonolithHero';
import { AnimatedText } from '@/components/AnimatedText';
import { StatCounter } from '@/components/StatCounter';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import {
    filterByTimeRange,
    normalizeToPercent,
    type EquityDataPoint,
    type TimeRange,
} from '@/lib/mockPerformanceData';
import { springHeavy } from '@/lib/motion';
import styles from './page.module.css';

/* ─── FAQ data ─── */
const FAQ_ITEMS = [
  {
    q: 'What is W3B?',
    a: 'W3B is a quantitative prediction fund powered by the MONOLITH engine. We generate returns by identifying and capitalizing on mispricings in CFTC-regulated event contracts using proprietary probability models.',
  },
  {
    q: 'How does W3B generate returns?',
    a: 'Our proprietary probability models systematically identify mispricings in CFTC-regulated event contracts. Every position is sized using fractional Kelly criterion with 14 independent circuit breakers managing risk in real-time.',
  },
  {
    q: 'Is my capital safe?',
    a: 'All positions are placed on Kalshi, a CFTC-regulated Designated Contract Market (DCM). Capital is secured with real-time monitoring, 14 independent circuit breakers, and a 60% cash reserve policy. Trading occurs exclusively on a regulated exchange — never on unregulated platforms.',
  },
  {
    q: 'Can I withdraw anytime?',
    a: 'Yes. You can withdraw your deposit and accumulated returns at any time, subject to settlement cycles. There are no lock-up periods or withdrawal penalties.',
  },
  {
    q: 'What is the fee structure?',
    a: 'W3B charges a 20% performance fee on profits above the high-water mark. You only pay when the fund makes you money. There are no deposit or withdrawal fees.',
  },
  {
    q: 'How are returns verified?',
    a: 'Every position is independently verified through our Track Record page. Settlement data comes directly from the Kalshi exchange API, providing a fully transparent and auditable performance history.',
  },
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const monolithY = scrollY * -0.25;
  const textY = scrollY * 0.15;
  const starStretch = 1 + scrollY * 0.001;
  const heroOpacity = Math.max(0, 1 - scrollY / 600);

  /* ─── Live stats from API ─── */
  const [totalReturn, setTotalReturn] = useState<number | null>(null);
  const [sharpe, setSharpe] = useState<number | null>(null);
  const [winRate, setWinRate] = useState<number | null>(null);
  const [positionsPlaced, setPositionsPlaced] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [portfolioRes, riskRes] = await Promise.all([
          fetch('/api/portfolio/summary'),
          fetch('/api/risk/metrics'),
        ]);
        const portfolio = portfolioRes.ok ? await portfolioRes.json() : null;
        const risk = riskRes.ok ? await riskRes.json() : null;

        const pData = portfolio?.data ?? portfolio;
        const rData = risk?.data ?? risk;

        setTotalReturn(pData?.totalReturnPct ?? pData?.totalReturn ?? null);
        setSharpe(rData?.sharpe ?? rData?.sharpeRatio ?? null);
        setWinRate(rData?.winRate ?? rData?.win_rate ?? null);
        setPositionsPlaced(pData?.totalPositions ?? pData?.tradeCount ?? null);
      } catch {
        // API unavailable — stats stay null, UI shows "—"
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  /* ─── Live equity curve from API ─── */
  const [chartData, setChartData] = useState<EquityDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    async function fetchEquity() {
      try {
        const res = await fetch('/api/portfolio/equity-curve');
        if (res.ok) {
          const json = await res.json();
          const raw = json.data ?? json;
          if (Array.isArray(raw) && raw.length >= 2) {
            const mapped: EquityDataPoint[] = raw.map((p: { date: string; equity?: number; value?: number; nav?: number }) => ({
              date: p.date,
              equity: p.equity ?? p.value ?? p.nav ?? 0,
              btc: 0,
              eth: 0,
              sp500: 0,
            }));
            setChartData(mapped);
          }
        }
      } catch {
        // API unavailable — chart stays empty
      } finally {
        setChartLoading(false);
      }
    }
    fetchEquity();
  }, []);

  /* ─── Filter & normalize chart data based on time range ─── */
  const displayChartData = chartData.length >= 2
      ? normalizeToPercent(filterByTimeRange(chartData, timeRange))
      : [];

  return (
    <PageContainer>
      {/* ═══════════════════════════════════════════
          HERO — "Quantitative Edge. Verified Returns."
          ═══════════════════════════════════════════ */}
      <section className={styles.hero} ref={heroRef} id="hero">
        <div
          className={styles.monolithWrap}
          style={{
            transform: `translateY(${monolithY}px) scaleY(${starStretch})`,
            opacity: heroOpacity,
          }}
        >
          <MonolithHero />
        </div>

        <motion.div
          className={styles.heroContent}
          style={{ transform: `translateY(${textY}px)`, opacity: heroOpacity }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springHeavy}
        >
          <HoloLabel>QUANTITATIVE PREDICTION FUND</HoloLabel>

          <h1 className={styles.heroTitle}>Quantitative Edge. Verified Returns.</h1>

          <div className={styles.heroSub}>
            <AnimatedText
              text="Your money, our models, transparent results. A quantitative fund that generates returns through CFTC-regulated event contracts — powered by probability models, not gut feel."
              mode="typewriter"
            />
          </div>

          {/* Key Stats Bar — live from API */}
          <div className={styles.apyBadge}>
            <span className={styles.apyLabel}>TOTAL RETURN</span>
            <span className={styles.apyValue}>
              {statsLoading ? '...' : totalReturn !== null ? (
                <StatCounter label="" value={totalReturn} suffix="%" decimals={1} />
              ) : '—'}
            </span>
          </div>

          <div className={styles.heroCtas}>
            <Link href="/register" className={styles.ctaPrimary}>GET STARTED</Link>
            <Link href="/performance" className={styles.ctaSecondary}>VIEW PERFORMANCE →</Link>
          </div>
        </motion.div>

        <div className={styles.scrollIndicator} style={{ opacity: heroOpacity }}>
          <span className={styles.scrollLabel}>SCROLL</span>
          <div className={styles.chevronGroup}>
            <div className={styles.chevron} />
            <div className={styles.chevron} />
            <div className={styles.chevron} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TRUST SIGNALS — Return, Sharpe, Win Rate, Positions (LIVE)
          ═══════════════════════════════════════════ */}
      <section className={styles.statsRibbon} id="stats">
        <HoloPanel size="md" depth="foreground" className={styles.statsPanel}>
          <div className={styles.statsRow}>
            <StatCounter
              label="TOTAL RETURN"
              value={totalReturn ?? 0}
              suffix="%"
              decimals={1}
              sparkline={totalReturn === null ? undefined : [0, 0, 0, 0, 0, 0, 0, 0]}
            />
            <StatCounter
              label="SHARPE RATIO"
              value={sharpe ?? 0}
              decimals={2}
              sparkline={sharpe === null ? undefined : [0, 0, 0, 0, 0, 0, 0, 0]}
            />
            <StatCounter
              label="WIN RATE"
              value={winRate ?? 0}
              suffix="%"
              decimals={1}
              sparkline={winRate === null ? undefined : [0, 0, 0, 0, 0, 0, 0, 0]}
            />
            <StatCounter
              label="POSITIONS PLACED"
              value={positionsPlaced ?? 0}
              sparkline={positionsPlaced === null ? undefined : [0, 0, 0, 0, 0, 0, 0, 0]}
            />
          </div>
        </HoloPanel>

        {/* Live Since Badge */}
        <div className={styles.liveSinceBadge}>
          <span className={styles.liveDot} />
          <span className={styles.liveText}>LIVE SINCE MARCH 2026</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS — 3-step visual
          ═══════════════════════════════════════════ */}
      <section className={styles.howItWorks} id="how-it-works">
        <HoloLabel>HOW IT WORKS</HoloLabel>
        <h2 className={styles.sectionTitle}>Three steps to verified returns</h2>

        <div className={styles.steps}>
          <div className={styles.progressLine} />

          <div className={styles.step}>
            <div className={styles.stepMarker}>
              <span className={styles.stepNumber}>01</span>
              <div className={styles.stepDot} />
            </div>
            <HoloPanel size="md" depth="mid" className={styles.stepPanel}>
              <div className={styles.stepIcon}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="4" y="10" width="20" height="14" rx="2" />
                  <path d="M4 14h20" />
                  <path d="M14 4v6" />
                  <path d="M11 7l3 3 3-3" />
                </svg>
              </div>
              <h4 className={styles.stepTitle}>INVEST</h4>
              <p className={styles.stepDesc}>
                Fund your account through the Vault. Your capital is deployed into CFTC-regulated prediction markets.
              </p>
            </HoloPanel>
          </div>

          <div className={styles.step}>
            <div className={styles.stepMarker}>
              <span className={styles.stepNumber}>02</span>
              <div className={styles.stepDot} />
            </div>
            <HoloPanel size="md" depth="mid" className={styles.stepPanel}>
              <div className={styles.stepIcon}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="14" cy="14" r="10" />
                  <circle cx="14" cy="14" r="5" />
                  <circle cx="14" cy="14" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <h4 className={styles.stepTitle}>PREDICT</h4>
              <p className={styles.stepDesc}>
                Our probability models identify +EV opportunities on CFTC-regulated event contracts — The Prediction Engine.
              </p>
            </HoloPanel>
          </div>

          <div className={styles.step}>
            <div className={styles.stepMarker}>
              <span className={styles.stepNumber}>03</span>
              <div className={styles.stepDot} />
            </div>
            <HoloPanel size="md" depth="mid" className={styles.stepPanel}>
              <div className={styles.stepIcon}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1">
                  <polyline points="4,22 10,16 14,18 20,8 24,10" />
                  <line x1="4" y1="24" x2="24" y2="24" opacity="0.3" />
                  <circle cx="24" cy="10" r="2" fill="currentColor" />
                </svg>
              </div>
              <h4 className={styles.stepTitle}>VERIFY</h4>
              <p className={styles.stepDesc}>
                Every position is independently verified. Transparent, auditable results — The Track Record.
              </p>
            </HoloPanel>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PERFORMANCE SNAPSHOT — Live equity curve from API
          ═══════════════════════════════════════════ */}
      <section className={styles.perfSnapshot} id="performance-snapshot">
        <HoloLabel>PERFORMANCE</HoloLabel>
        <h2 className={styles.sectionTitle}>Real returns, fully transparent</h2>
        <p className={styles.sectionSub}>Fund performance powered by the MONOLITH prediction engine.</p>

        <HoloPanel size="lg" depth="foreground" className={styles.perfPanel}>
          {chartLoading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(0,240,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}>
              LOADING PERFORMANCE DATA…
            </div>
          ) : displayChartData.length >= 2 ? (
            <EquityCurveChart
              data={displayChartData}
              activeRange={timeRange}
              onRangeChange={setTimeRange}
              height={280}
            />
          ) : (
            <div className={styles.perfChart}>
              <div className={styles.perfOverlay}>
                <span className={styles.perfLabel}>EQUITY CURVE</span>
                <span className={styles.perfNote}>Performance data will populate once the engine is live</span>
              </div>
            </div>
          )}
        </HoloPanel>

        <Link href="/performance" className={styles.learnMore}>
          VIEW FULL PERFORMANCE ANALYTICS →
        </Link>
      </section>

      {/* ═══════════════════════════════════════════
          TRUST & SECURITY
          ═══════════════════════════════════════════ */}
      <section className={styles.trust} id="trust">
        <HoloLabel>TRUST &amp; SECURITY</HoloLabel>
        <h2 className={styles.sectionTitle}>Built for the paranoid</h2>

        <div className={styles.trustGrid}>
          <HoloPanel size="sm" depth="mid">
            <div className={styles.trustIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h4 className={styles.trustTitle}>CFTC-REGULATED</h4>
            <p className={styles.trustDesc}>All positions placed on a CFTC-regulated Designated Contract Market. Fully compliant.</p>
          </HoloPanel>

          <HoloPanel size="sm" depth="mid">
            <div className={styles.trustIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <h4 className={styles.trustTitle}>24/7 MONITORING</h4>
            <p className={styles.trustDesc}>14 independent circuit breakers with real-time risk monitoring around the clock</p>
          </HoloPanel>

          <HoloPanel size="sm" depth="mid">
            <div className={styles.trustIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>
            <h4 className={styles.trustTitle}>FULLY TRANSPARENT</h4>
            <p className={styles.trustDesc}>Every position independently verified. Full transparency through the Track Record.</p>
          </HoloPanel>

          <HoloPanel size="sm" depth="mid">
            <div className={styles.trustIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h4 className={styles.trustTitle}>RISK MANAGED</h4>
            <p className={styles.trustDesc}>14 independent circuit breakers, Kelly criterion sizing, and 60% cash reserve policy.</p>
          </HoloPanel>
        </div>

        <Link href="/security" className={styles.learnMore}>
          VIEW SECURITY DETAILS →
        </Link>
      </section>

      {/* ═══════════════════════════════════════════
          FAQ — Collapsible accordion
          ═══════════════════════════════════════════ */}
      <section className={styles.faq} id="faq">
        <HoloLabel>FAQ</HoloLabel>
        <h2 className={styles.sectionTitle}>Frequently asked questions</h2>

        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className={styles.faqChevron}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className={styles.faqAnswer}>
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════ */}
      <section className={styles.cta} id="cta">
        <h2 className={styles.ctaTitle}>
          <AnimatedText text="Ready to put your capital to work?" mode="cascade" as="span" />
        </h2>
        <p className={styles.ctaSub}>Create a free account and access verified, risk-managed returns.</p>

        <div className={styles.ctaButtons}>
          <Link href="/register" className={styles.ctaPrimary}>CREATE ACCOUNT</Link>
          <Link href="/docs" className={styles.ctaSecondary}>READ THE DOCS →</Link>
        </div>
      </section>
    </PageContainer>
  );
}
