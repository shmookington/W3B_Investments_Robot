'use client';

import { useState } from 'react';
import { HoloPanel } from '@/components/HoloPanel';
import { HoloLabel } from '@/components/HoloText';
import { PageContainer } from '@/components/Layout';
import { StatCounter } from '@/components/StatCounter';
import { MonolithNav } from '@/components/MonolithNav';
import styles from './page.module.css';

/* ── Config ─── */
const STRATEGIES = [
    { value: 'momentum', label: 'Momentum Alpha' },
    { value: 'mean_reversion', label: 'Mean Reversion' },
    { value: 'trend_following', label: 'Trend Following' },
    { value: 'breakout', label: 'Breakout (Donchian)' },
    { value: 'rsi_divergence', label: 'RSI Divergence' },
    { value: 'vwap_reversion', label: 'VWAP Reversion' },
    { value: 'volatility_breakout', label: 'Volatility Breakout' },
];
const SYMBOLS = [
    { value: 'SOCCER', label: 'Soccer Events' },
    { value: 'NBA', label: 'NBA Events' },
    { value: 'CFB', label: 'College Football Events' },
    { value: 'NFL', label: 'NFL Events' },
];
const DAY_OPTIONS = [
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
    { value: 180, label: '180D' },
    { value: 365, label: '1Y' },
];
const SIM_OPTIONS = [50, 100, 250, 500];

/* ── Types ─── */
interface BacktestResult {
    strategy: string;
    symbol: string;
    num_simulations: number;
    mean_return_pct: number;
    median_return_pct: number;
    std_return_pct: number;
    p5_return_pct: number;
    p25_return_pct: number;
    p75_return_pct: number;
    p95_return_pct: number;
    prob_profit_pct: number;
    best_sharpe: number;
    best_return_pct: number;
    best_params: Record<string, number>;
    best_win_rate: number;
    best_profit_factor: number;
    best_max_dd: number;
    best_num_trades: number;
    avg_sharpe: number;
    avg_win_rate: number;
    avg_max_dd: number;
    avg_profit_factor: number;
    avg_num_trades: number;
    start_date: string;
    end_date: string;
    data_points: number;
}

/* ── Component ─── */
export default function SimLabPage() {
    const [strategy, setStrategy] = useState('momentum');
    const [symbol, setSymbol] = useState('NBA');
    const [days, setDays] = useState(90);
    const [sims, setSims] = useState(100);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [elapsed, setElapsed] = useState(0);

    const handleRun = async () => {
        setRunning(true);
        setError(null);
        setResult(null);

        const startTime = Date.now();
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        try {
            const res = await fetch('/api/backtest/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategy, symbol, days, simulations: sims }),
            });

            const json = await res.json();

            if (!json.success) {
                throw new Error(json.error || 'Backtest failed');
            }

            setResult(json.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            clearInterval(timer);
            setRunning(false);
        }
    };

    const symbolLabel = SYMBOLS.find(s => s.value === symbol)?.label ?? symbol;

    return (
        <PageContainer>
            <MonolithNav />

            {/* ═══════════════════════════════════════════
          RUN BACKTEST CONFIGURATION
          ═════════════════════════════════════════ */}
            <section className={styles.runPanel}>
                <HoloPanel size="sm" depth="mid" header="SIMULATION LAB — BACKTEST ENGINE">
                    <div className={styles.runForm}>
                        {/* Strategy */}
                        <div className={styles.formField}>
                            <label className={styles.formLabel}>STRATEGY</label>
                            <select className={styles.formSelect} value={strategy} onChange={e => setStrategy(e.target.value)} disabled={running}>
                                {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Symbol */}
                        <div className={styles.formField}>
                            <label className={styles.formLabel}>EVENT CATEGORY</label>
                            <select className={styles.formSelect} value={symbol} onChange={e => setSymbol(e.target.value)} disabled={running}>
                                {SYMBOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Lookback Period */}
                        <div className={styles.formField}>
                            <label className={styles.formLabel}>LOOKBACK PERIOD</label>
                            <div className={styles.mcBar}>
                                {DAY_OPTIONS.map(d => (
                                    <button
                                        key={d.value}
                                        className={`${styles.mcBtn} ${days === d.value ? styles.mcActive : ''}`}
                                        onClick={() => setDays(d.value)}
                                        disabled={running}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Monte Carlo Sims */}
                        <div className={styles.formField}>
                            <label className={styles.formLabel}>MONTE CARLO SIMS</label>
                            <div className={styles.mcBar}>
                                {SIM_OPTIONS.map(n => (
                                    <button
                                        key={n}
                                        className={`${styles.mcBtn} ${sims === n ? styles.mcActive : ''}`}
                                        onClick={() => setSims(n)}
                                        disabled={running}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Run Button */}
                        <button className={styles.runBtn} onClick={handleRun} disabled={running}>
                            {running ? (
                                <><span className={styles.spinner} /> RUNNING… {elapsed}s</>
                            ) : (
                                '▶ RUN BACKTEST'
                            )}
                        </button>

                        {running && (
                            <p style={{ color: 'rgba(0,240,255,0.4)', fontSize: '10px', fontFamily: '"JetBrains Mono", monospace', marginTop: '8px', textAlign: 'center' }}>
                                Fetching {days}D of {symbolLabel} data from Kalshi → running {sims} Monte Carlo simulations…
                            </p>
                        )}
                    </div>
                </HoloPanel>
            </section>

            {/* ═══════════════════════════════════════════
          ERROR STATE
          ═════════════════════════════════════════ */}
            {error && (
                <section className={styles.results} style={{ padding: '0 20px' }}>
                    <HoloPanel size="sm" depth="mid">
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            <div style={{ color: '#ff4444', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', marginBottom: '8px' }}>
                                ✗ BACKTEST FAILED
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                                {error}
                            </div>
                        </div>
                    </HoloPanel>
                </section>
            )}

            {/* ═══════════════════════════════════════════
          RESULTS
          ═════════════════════════════════════════ */}
            {result && (
                <>
                    <section className={styles.results}>
                        <HoloLabel>
                            RESULTS — {strategy.toUpperCase().replace('_', ' ')} / {symbolLabel} / {days}D / {result.num_simulations} SIMS
                        </HoloLabel>

                        {/* Key Metrics */}
                        <div className={styles.metricsGrid}>
                            <HoloPanel size="sm" depth="foreground" glow={result.avg_sharpe >= 1.5 ? 'green' : undefined}>
                                <StatCounter label="AVG SHARPE" value={result.avg_sharpe} decimals={2} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground" glow={result.best_sharpe >= 2 ? 'green' : undefined}>
                                <StatCounter label="BEST SHARPE" value={result.best_sharpe} decimals={2} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="AVG MAX DD" value={result.avg_max_dd} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="AVG WIN RATE" value={result.avg_win_rate} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="AVG PROFIT FACTOR" value={result.avg_profit_factor} decimals={2} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="PROB. OF PROFIT" value={result.prob_profit_pct} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="BEST RETURN" value={result.best_return_pct} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="AVG TRADES" value={result.avg_num_trades} decimals={0} />
                            </HoloPanel>
                        </div>
                    </section>

                    {/* Monte Carlo Distribution */}
                    <section className={styles.cpcv}>
                        <HoloLabel>MONTE CARLO DISTRIBUTION — {result.num_simulations} SIMULATIONS</HoloLabel>
                        <div className={styles.cpcvGrid}>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="MEDIAN RETURN" value={result.median_return_pct} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="MEAN RETURN" value={result.mean_return_pct} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <StatCounter label="STD DEV" value={result.std_return_pct} suffix="%" decimals={1} />
                            </HoloPanel>
                            <HoloPanel size="sm" depth="foreground">
                                <div className={styles.cpcvCompare}>
                                    <div className={styles.cpcvRow}>
                                        <span className={styles.cpcvKey}>P5 (WORST)</span>
                                        <span className={styles.cpcvVal} style={{ color: result.p5_return_pct >= 0 ? '#28ca41' : '#ff4444' }}>
                                            {result.p5_return_pct >= 0 ? '+' : ''}{result.p5_return_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className={styles.cpcvRow}>
                                        <span className={styles.cpcvKey}>P25</span>
                                        <span className={styles.cpcvVal}>
                                            {result.p25_return_pct >= 0 ? '+' : ''}{result.p25_return_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className={styles.cpcvRow}>
                                        <span className={styles.cpcvKey}>MEDIAN</span>
                                        <span className={styles.cpcvVal}>
                                            {result.median_return_pct >= 0 ? '+' : ''}{result.median_return_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className={styles.cpcvRow}>
                                        <span className={styles.cpcvKey}>P75</span>
                                        <span className={styles.cpcvVal}>
                                            {result.p75_return_pct >= 0 ? '+' : ''}{result.p75_return_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className={styles.cpcvRow}>
                                        <span className={styles.cpcvKey}>P95 (BEST)</span>
                                        <span className={styles.cpcvVal} style={{ color: '#28ca41' }}>
                                            {result.p95_return_pct >= 0 ? '+' : ''}{result.p95_return_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </HoloPanel>
                        </div>
                    </section>

                    {/* Best Parameters */}
                    <section className={styles.comparison}>
                        <HoloPanel size="sm" depth="mid" header="BEST PARAMETERS FOUND">
                            <table className={styles.compTable}>
                                <thead>
                                    <tr>
                                        <th>PARAMETER</th>
                                        <th>VALUE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(result.best_params).map(([key, val]) => (
                                        <tr key={key}>
                                            <td className={styles.compName}>{key.replace(/_/g, ' ').toUpperCase()}</td>
                                            <td className={styles.goodVal}>{typeof val === 'number' ? val.toFixed(2) : String(val)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </HoloPanel>
                    </section>

                    {/* Best Run Summary */}
                    <section className={styles.library}>
                        <HoloPanel size="sm" depth="mid" header="BEST SIMULATION RESULT">
                            <table className={styles.libTable}>
                                <thead>
                                    <tr><th>METRIC</th><th>VALUE</th></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={styles.libName}>Sharpe Ratio</td>
                                        <td className={result.best_sharpe >= 1.5 ? styles.goodVal : ''}>{result.best_sharpe.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Return</td>
                                        <td className={result.best_return_pct >= 0 ? styles.goodVal : styles.ddVal}>
                                            {result.best_return_pct >= 0 ? '+' : ''}{result.best_return_pct.toFixed(1)}%
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Max Drawdown</td>
                                        <td className={styles.ddVal}>{result.best_max_dd.toFixed(1)}%</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Win Rate</td>
                                        <td>{result.best_win_rate.toFixed(1)}%</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Profit Factor</td>
                                        <td>{result.best_profit_factor.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Total Trades</td>
                                        <td>{result.best_num_trades}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Data Period</td>
                                        <td className={styles.dimCell}>
                                            {result.start_date?.split('T')[0] ?? '—'} → {result.end_date?.split('T')[0] ?? '—'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.libName}>Data Points</td>
                                        <td className={styles.dimCell}>{result.data_points?.toLocaleString() ?? '—'} candles</td>
                                    </tr>
                                </tbody>
                            </table>
                        </HoloPanel>
                    </section>
                </>
            )}

            {/* ═══════════════════════════════════════════
          EMPTY STATE (no results yet)
          ═════════════════════════════════════════ */}
            {!result && !running && !error && (
                <section className={styles.results} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <HoloPanel size="md" depth="mid">
                        <div style={{ padding: '40px 20px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>◈</div>
                            <div style={{ color: 'rgba(0,240,255,0.5)', fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', letterSpacing: '2px', marginBottom: '8px' }}>
                                SELECT PARAMETERS AND RUN
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', lineHeight: '1.6' }}>
                                Choose a strategy, event category, and time period above, then click ▶ RUN BACKTEST.
                                <br />The engine will fetch real Kalshi historical event data and run Monte Carlo simulations.
                            </div>
                        </div>
                    </HoloPanel>
                </section>
            )}
        </PageContainer>
    );
}
