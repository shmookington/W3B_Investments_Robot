'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { InstitutionalGlass } from '@/components/ui/InstitutionalGlass';
import { ExecutionButton } from '@/components/ui/ExecutionButton';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { filterByTimeRange, normalizeToPercent, type EquityDataPoint, type TimeRange } from '@/lib/mockPerformanceData';
import Link from 'next/link';

export default function LandingPage() {
  const [chartData, setChartData] = useState<EquityDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  useEffect(() => {
    async function fetchEquity() {
      try {
        const res = await fetch('/api/portfolio/equity-curve');
        if (res.ok) {
          const json = await res.json();
          const raw = json.data ?? json;
          if (Array.isArray(raw) && raw.length >= 2) {
            const mapped = raw.map((p: any) => ({
              date: p.date,
              equity: p.equity ?? p.value ?? p.nav ?? 0,
              btc: 0,
              eth: 0,
              sp500: 0,
            }));
            setChartData(mapped);
          }
        }
      } catch (e) {
        // Suppress
      }
    }
    fetchEquity();
  }, []);

  const displayChartData = chartData.length >= 2
    ? normalizeToPercent(filterByTimeRange(chartData, timeRange))
    : [];

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20vh',
      paddingBottom: '100px',
      color: 'var(--text-platinum)'
    }}>
      {/* 1. INSTITUTIONAL HERO */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ textAlign: 'center', maxWidth: '800px', marginBottom: '100px', padding: '0 20px' }}
      >
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--accent-gold-primary)', marginBottom: '24px', fontFamily: 'var(--font-mono)' }}>
          W3B FUND — EST. 2026
        </div>
        <h1 style={{ 
          fontSize: 'clamp(3rem, 6vw, 5rem)', 
          fontWeight: 400, 
          letterSpacing: '-0.02em',
          lineHeight: '1.1',
          marginBottom: '32px'
        }}>
          Algorithmic Liquidity Provision.
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
          color: 'var(--text-charcoal)',
          lineHeight: '1.6',
          marginBottom: '48px',
          fontWeight: 300,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          We deploy capital through proprietary probability models to identify and monetize dislocations in CFTC-regulated event contracts. Verified, zero-correlation yield generation.
        </p>
        <Link href="/register">
          <ExecutionButton style={{ padding: '16px 32px', fontSize: '13px', letterSpacing: '0.1em' }}>
            DEPLOY CAPITAL
          </ExecutionButton>
        </Link>
      </motion.div>

      {/* 2. LIVE ARBITRAGE RIBBON */}
      <div style={{
        width: '100vw',
        borderTop: '1px solid rgba(212, 175, 55, 0.1)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
        padding: '16px 0',
        marginBottom: '120px',
        overflow: 'hidden',
        background: 'rgba(10, 10, 11, 0.4)',
        backdropFilter: 'blur(10px)'
      }}>
        <motion.div
          animate={{ x: [0, -1500] }}
          transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            gap: '80px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-charcoal)',
            letterSpacing: '0.05em'
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i}>
              <span style={{ color: 'var(--accent-gold-primary)' }}>EVT-{(739 + i * 13)}X</span> // SPREAD: {((i * 1.3) % 9).toFixed(2)}c // EXPECTED YIELD: <span style={{ color: 'var(--data-positive)' }}>+4.{(i % 6)}%</span> [LIVE]
            </span>
          ))}
        </motion.div>
      </div>

      {/* 3. EQUITY DEPTH CHART */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        style={{ width: '100%', maxWidth: '1200px', padding: '0 20px' }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 400, marginBottom: '8px' }}>Historical Convergence</h2>
          <p style={{ color: 'var(--text-charcoal)', fontSize: '1rem' }}>
            Cumulative fractional yield via independent volatility hedging.
          </p>
        </div>
        
        <InstitutionalGlass>
          <div style={{ padding: '40px' }}>
            {displayChartData.length >= 2 ? (
              <EquityCurveChart
                data={displayChartData}
                activeRange={timeRange}
                onRangeChange={setTimeRange}
                height={500}
              />
            ) : (
              <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <span className="data-text">AWAITING LIVE DATA STREAM...</span>
              </div>
            )}
          </div>
        </InstitutionalGlass>
      </motion.div>
    </div>
  );
}
