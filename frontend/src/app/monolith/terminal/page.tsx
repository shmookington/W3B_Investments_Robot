'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/Layout';
import styles from './page.module.css';

/* ─── Types ─── */
interface EngineHealth {
    status: string;
    uptime_seconds: number;
    paper_mode: boolean;
    strategies_active: number;
    open_positions: number;
    exchanges: { name: string; status: string; latency_ms: number }[];
    system: { cpu_percent: number; memory_percent: number; disk_percent: number };
    live_engine?: boolean;
}

interface Position {
    symbol: string;
    side: string;
    size: number;
    entry_price: number;
    current_price: number;
    unrealized_pnl: number;
    strategy: string;
    exchange: string;
    entry_time?: string;
}

interface Toast {
    id: string;
    message: string;
    type: 'open' | 'close-win' | 'close-loss';
    timestamp: number;
}

interface TradeRecord {
    id: string;
    asset: string;
    strategy: string;
    side: string;
    entryPrice: number;
    exitPrice: number | null;
    size: number;
    pnl: number | null;
    pnlPercent: number | null;
    fees: number;
    status: string;
    timestamp: string;
}

interface MarketPrice {
    symbol: string;
    label: string;
    price: number;
    prevPrice: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume: number;
}

interface Signal {
    signal_id: string;
    event: string;
    sport: string;
    league: string;
    selection: string;
    model_prob: number;
    market_prob: number;
    edge_pct: number;
    kelly_fraction: number;
    recommended_size_usd: number;
    contracts: number;
    entry_price: number;
    confidence: string;
    status: string;
    generated_at: string;
    model_source: string;
}

interface PnlData {
    daily: number;
    weekly: number;
    monthly: number;
    all_time: number;
    total_fees: number;
    realized: number;
    unrealized: number;
    closed_trades: number;
}

/* ─── Helpers ─── */
function formatMoney(n: number, showSign = false): string {
    const sign = showSign ? (n >= 0 ? '+' : '') : '';
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPrice(n: number): string {
    if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    return `$${n.toFixed(4)}`;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getUTCClock(): string {
    return new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC';
}

function pnlColor(n: number): string {
    if (n > 0) return '#00ff88';
    if (n < 0) return '#ff4466';
    return 'rgba(255,255,255,0.5)';
}

function formatDuration(isoOrSeconds: string | number): string {
    let totalSec: number;
    if (typeof isoOrSeconds === 'string') {
        totalSec = Math.floor((Date.now() - new Date(isoOrSeconds).getTime()) / 1000);
    } else {
        totalSec = isoOrSeconds;
    }
    if (totalSec < 0) totalSec = 0;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m >= 60) {
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    }
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

const ENGINE_API = '/api/engine/proxy?endpoint=';

/* ─── TimeHeld Component — live counter ─── */
function TimeHeld({ since }: { since: string }) {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const update = () => setElapsed(formatDuration(since));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [since]);
    return <span>{elapsed}</span>;
}

/* ─── AnimatedNumber — smooth counting effect ─── */
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const from = prevRef.current;
        const to = value;
        if (from === to) return;
        const diff = to - from;
        const duration = 600;
        const start = performance.now();

        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(from + diff * eased);
            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                prevRef.current = to;
            }
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [value]);

    return <>{prefix}{display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

/* ─── Particles — ambient floating particles ─── */
function Particles({ intensity }: { intensity: 'idle' | 'active' }) {
    const count = intensity === 'active' ? 12 : 6;
    return (
        <div className={styles.particles}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`${styles.particle} ${intensity === 'active' ? styles.particleActive : ''}`}
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${4 + Math.random() * 4}s`,
                    }}
                />
            ))}
        </div>
    );
}

/* ─── Confetti Burst ─── */
function ConfettiBurst({ trigger }: { trigger: number }) {
    const [show, setShow] = useState(false);
    const prevTrigger = useRef(trigger);

    useEffect(() => {
        if (trigger > prevTrigger.current) {
            setShow(true);
            const timer = setTimeout(() => setShow(false), 2500);
            prevTrigger.current = trigger;
            return () => clearTimeout(timer);
        }
    }, [trigger]);

    if (!show) return null;
    const colors = ['#00ff88', '#ff4466', '#ffbd2e', '#00c8ff', '#ff88cc', '#88ff00'];
    return (
        <div className={styles.confettiContainer}>
            {Array.from({ length: 30 }).map((_, i) => (
                <div
                    key={i}
                    className={styles.confettiPiece}
                    style={{
                        left: `${40 + Math.random() * 20}%`,
                        background: colors[i % colors.length],
                        animationDelay: `${Math.random() * 0.5}s`,
                        animationDuration: `${1.2 + Math.random() * 1.3}s`,
                        ['--spread' as string]: `${(Math.random() - 0.5) * 300}px`,
                    }}
                />
            ))}
        </div>
    );
}

/* ─── Sparkline Component ─── */
function Sparkline({ data, color, width = 200, height = 50 }: { data: number[]; color: string; width?: number; height?: number }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className={styles.sparkline}>
            <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                points={points}
            />
            <polygon
                fill="url(#sparkGrad)"
                points={`0,${height} ${points} ${width},${height}`}
            />
        </svg>
    );
}

/* ─── Main Component ─── */
export default function EngineMonitor() {
    // Engine state
    const [health, setHealth] = useState<EngineHealth | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [trades, setTrades] = useState<TradeRecord[]>([]);
    const [pnl, setPnl] = useState<PnlData>({ daily: 0, weekly: 0, monthly: 0, all_time: 0, total_fees: 0, realized: 0, unrealized: 0, closed_trades: 0 });
    const [aum, setAum] = useState(0);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [capitalData, setCapitalData] = useState<{ total: number; deployable: number; deployed: number; available: number; reserve_pct: number } | null>(null);
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [clock, setClock] = useState(getUTCClock());
    const [engineOnline, setEngineOnline] = useState(false);
    const [equityHistory, setEquityHistory] = useState<number[]>([0]);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [prevPnl, setPrevPnl] = useState(0);
    const [pnlFlash, setPnlFlash] = useState<'none' | 'up' | 'down'>('none');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const prevPositionsRef = useRef<Position[]>([]);
    const [positionPnlDelta, setPositionPnlDelta] = useState<Record<string, 'up' | 'down' | 'none'>>({});
    const prevPosPnlRef = useRef<Record<string, number>>({});
    const priceHistoryRef = useRef<Record<string, number[]>>({});
    const [scanCountdown, setScanCountdown] = useState(10);
    const [regime, setRegime] = useState<string>('unknown');
    const [pollError, setPollError] = useState<string | null>(null);
    const pollFailCount = useRef(0);
    const [confettiTrigger, setConfettiTrigger] = useState(0);
    const milestonesHit = useRef<Set<number>>(new Set());
    const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
    const isManualClosing = useRef(false);

    // Clock
    useEffect(() => {
        const interval = setInterval(() => setClock(getUTCClock()), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Fetch SIGNALS + CAPITAL from engine ──
    useEffect(() => {
        const fetchSignalsAndCapital = async () => {
            try {
                const [sigRes, capRes, schedRes] = await Promise.allSettled([
                    fetch(`${ENGINE_API}api/signals/today`).then(r => r.json()),
                    fetch(`${ENGINE_API}api/account/balance`).then(r => r.json()),
                    fetch(`${ENGINE_API}live/schedule`).then(r => r.json()),
                ]);

                // Signals
                if (sigRes.status === 'fulfilled' && sigRes.value.signals) {
                    setSignals(sigRes.value.signals);
                }

                // Capital
                if (capRes.status === 'fulfilled' && capRes.value) {
                    const c = capRes.value;
                    const aumValue = c.balance_dollars ?? (c.capital?.total_balance_usd) ?? (c.capital?.total) ?? 0;
                    setAum(aumValue);
                    setCapitalData({
                        total: aumValue,
                        deployable: aumValue,
                        deployed: c.portfolio_value_dollars ?? (c.capital?.currently_deployed_usd) ?? (c.capital?.deployed) ?? 0,
                        available: aumValue,
                        reserve_pct: c.capital?.cash_reserve_pct ?? c.capital?.reserve_pct ?? 0,
                    });
                    setEquityHistory(prev => [...prev.slice(-60), aumValue]);
                }

                // Schedule -> sport ticker
                if (schedRes.status === 'fulfilled') {
                    const data = schedRes.value;
                    const events = data.events ?? data.schedule ?? [];
                    const sportCounts: Record<string, { total: number; withSignals: number; live: number }> = {};
                    for (const e of events) {
                        const sport = (e.sport ?? e.league ?? 'OTHER').toUpperCase();
                        if (!sportCounts[sport]) sportCounts[sport] = { total: 0, withSignals: 0, live: 0 };
                        sportCounts[sport].total++;
                        if (e.hasSignal || e.signal) sportCounts[sport].withSignals++;
                        if (e.status === 'live' || e.status === 'in_progress') sportCounts[sport].live++;
                    }
                    const sportLabels: Record<string, string> = { 'SOCCER': '⚽ Soccer', 'NBA': '🏀 NBA', 'CFB': '🏈 CFB', 'NFL': '🏈 NFL' };
                    const newPrices: MarketPrice[] = Object.entries(sportCounts)
                        .filter(([key]) => ['SOCCER', 'NBA', 'CFB', 'NFL'].includes(key))
                        .map(([key, val]) => ({
                            symbol: key,
                            label: sportLabels[key] ?? key,
                            price: val.total,
                            prevPrice: val.total,
                            change24h: val.withSignals,
                            high24h: val.live,
                            low24h: 0,
                            volume: val.total,
                        }));
                    setPrices(newPrices);
                }
            } catch { /* engine offline */ }
        };
        fetchSignalsAndCapital();
        const interval = setInterval(fetchSignalsAndCapital, 15_000);
        return () => clearInterval(interval);
    }, []);


    // ── Core polling — ALL data from the real engine ──
    useEffect(() => {
        const poll = async () => {
            try {
                const [h, adm, admPnl, pos, t] = await Promise.allSettled([
                    fetch(`${ENGINE_API}health`).then(r => r.json()),
                    fetch(`${ENGINE_API}admin/status`).then(r => r.json()),
                    fetch(`${ENGINE_API}admin/pnl`).then(r => r.json()),
                    fetch(`${ENGINE_API}live/positions`).then(r => r.json()),
                    fetch(`${ENGINE_API}live/trades`).then(r => r.json()),
                ]);

                // Health
                const healthOk = h.status === 'fulfilled' && !h.value.engine_offline && (h.value.status === 'ok' || h.value.status === 'running');
                const admOk = adm.status === 'fulfilled' && !adm.value.engine_offline;
                setEngineOnline(healthOk || admOk);
                if (healthOk || admOk) {
                    pollFailCount.current = 0;
                    setPollError(null);
                }

                if (healthOk) {
                    setHealth(h.value);
                }

                // AUM from admin/status
                if (admOk && adm.value.aum) {
                    setAum(adm.value.aum);
                    setEquityHistory(prev => [...prev.slice(-60), adm.value.aum]);
                }
                if (admOk && adm.value.regime) {
                    setRegime(adm.value.regime);
                }

                // PnL
                if (admPnl.status === 'fulfilled' && !admPnl.value.engine_offline) {
                    const p = admPnl.value;
                    const newPnl: PnlData = {
                        daily: p.daily ?? 0,
                        weekly: p.weekly ?? 0,
                        monthly: p.monthly ?? 0,
                        all_time: p.all_time ?? 0,
                        total_fees: p.total_fees ?? 0,
                        realized: p.realized ?? 0,
                        unrealized: p.unrealized ?? 0,
                        closed_trades: p.closed_trades ?? 0,
                    };
                    setPnl(newPnl);

                    // P&L flash animation
                    const totalPnl = (newPnl.realized ?? 0) + (newPnl.unrealized ?? 0);
                    if (totalPnl > prevPnl) {
                        setPnlFlash('up');
                        setTimeout(() => setPnlFlash('none'), 800);
                    } else if (totalPnl < prevPnl) {
                        setPnlFlash('down');
                        setTimeout(() => setPnlFlash('none'), 800);
                    }
                    setPrevPnl(totalPnl);
                }

                // Open positions — detect opens/closes for toasts
                if (pos.status === 'fulfilled' && !pos.value.engine_offline && !isManualClosing.current) {
                    const posArr: Position[] = pos.value.positions ?? [];
                    const prev = prevPositionsRef.current;
                    const prevSymbols = new Set(prev.map((p: Position) => p.symbol));
                    const newSymbols = new Set(posArr.map((p: Position) => p.symbol));

                    // Detect new opens
                    for (const p of posArr) {
                        if (!prevSymbols.has(p.symbol)) {
                            setToasts(t => [...t, {
                                id: `${Date.now()}-${p.symbol}`,
                                message: `🟢 OPENED ${p.side.toUpperCase()} ${p.symbol} @ ${formatPrice(p.entry_price)}`,
                                type: 'open',
                                timestamp: Date.now(),
                            }]);
                        }
                    }

                    // Detect closes
                    for (const p of prev) {
                        if (!newSymbols.has(p.symbol)) {
                            const won = p.unrealized_pnl >= 0;
                            setToasts(t => [...t, {
                                id: `${Date.now()}-${p.symbol}-close`,
                                message: `${won ? '💰' : '🔴'} CLOSED ${p.symbol} ${won ? 'WIN' : 'LOSS'} ${formatMoney(p.unrealized_pnl, true)}`,
                                type: won ? 'close-win' : 'close-loss',
                                timestamp: Date.now(),
                            }]);
                        }
                    }

                    // Track P&L movement per position for pulsing glow
                    const deltas: Record<string, 'up' | 'down' | 'none'> = {};
                    for (const p of posArr) {
                        const prevVal = prevPosPnlRef.current[p.symbol] ?? 0;
                        if (p.unrealized_pnl > prevVal) deltas[p.symbol] = 'up';
                        else if (p.unrealized_pnl < prevVal) deltas[p.symbol] = 'down';
                        else deltas[p.symbol] = 'none';
                        prevPosPnlRef.current[p.symbol] = p.unrealized_pnl;
                    }
                    setPositionPnlDelta(deltas);

                    prevPositionsRef.current = posArr;
                    setPositions(posArr);
                }

                // Closed trades
                if (t.status === 'fulfilled' && !t.value.engine_offline) {
                    const engineTrades = t.value.trades ?? [];
                    if (Array.isArray(engineTrades)) {
                        setTrades(engineTrades.map((tr: Record<string, unknown>, i: number) => ({
                            id: (tr.id as string) ?? `t-${i}`,
                            asset: (tr.asset as string) ?? (tr.symbol as string) ?? 'Unknown',
                            strategy: (tr.strategy as string) ?? '',
                            side: (tr.side as string) ?? 'long',
                            entryPrice: (tr.entryPrice as number) ?? (tr.entry_price as number) ?? 0,
                            exitPrice: (tr.exitPrice as number | null) ?? (tr.exit_price as number | null) ?? null,
                            size: (tr.size as number) ?? 0,
                            pnl: (tr.pnl as number | null) ?? null,
                            pnlPercent: (tr.pnlPercent as number | null) ?? null,
                            fees: (tr.fees as number) ?? 0,
                            status: (tr.status as string) ?? 'closed',
                            timestamp: (tr.timestamp as string) ?? new Date().toISOString(),
                        })));
                    }
                }

                setLastUpdate(new Date().toLocaleTimeString('en-US', { hour12: false }));
            } catch (err) {
                pollFailCount.current += 1;
                if (pollFailCount.current >= 2) {
                    setPollError(`Engine connection lost (${err instanceof Error ? err.message : 'unknown error'})`);
                    setEngineOnline(false);
                }
            }
        };
        poll();
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Scan countdown — resets every 10s when poll fires
    useEffect(() => {
        const id = setInterval(() => {
            setScanCountdown(prev => (prev <= 1 ? 10 : prev - 1));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    // Derived values
    const uptimeStr = useMemo(() => {
        const s = health?.uptime_seconds ?? 0;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }, [health]);

    const totalPnl = (pnl.realized ?? 0) + (pnl.unrealized ?? 0);
    const winCount = trades.filter(t => (t.pnl ?? 0) > 0).length;
    const lossCount = trades.filter(t => (t.pnl ?? 0) < 0).length;
    const winRate = trades.length > 0 ? Math.round((winCount / trades.length) * 100) : 0;

    // Manual close position handler — OPTIMISTIC: remove immediately, then confirm
    const handleClosePosition = async (symbol: string) => {
        // Block polls from overwriting positions during close
        isManualClosing.current = true;
        // Optimistically remove position from UI immediately
        const closingPos = positions.find(p => p.symbol === symbol);
        setPositions(prev => prev.filter(p => p.symbol !== symbol));
        setClosingSymbol(symbol);

        try {
            const res = await fetch('/api/engine/proxy?endpoint=live/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol }),
            });
            const data = await res.json();
            if (data.success) {
                setToasts(t => [...t, {
                    id: `close-${Date.now()}`,
                    message: `✋ CLOSED ${data.side?.toUpperCase()} ${symbol} | ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)} (${data.pnl_pct >= 0 ? '+' : ''}${data.pnl_pct.toFixed(2)}%)`,
                    type: data.pnl >= 0 ? 'close-win' : 'close-loss',
                    timestamp: Date.now(),
                }]);
            } else {
                // Restore position if close failed
                if (closingPos) setPositions(prev => [...prev, closingPos]);
                setToasts(t => [...t, {
                    id: `close-err-${Date.now()}`,
                    message: `⚠ ${data.error || 'Failed to close'}`,
                    type: 'close-loss',
                    timestamp: Date.now(),
                }]);
            }
        } catch {
            // Restore position on network error
            if (closingPos) setPositions(prev => [...prev, closingPos]);
            setToasts(t => [...t, {
                id: `close-err-${Date.now()}`,
                message: '⚠ Network error closing position',
                type: 'close-loss',
                timestamp: Date.now(),
            }]);
        } finally {
            setClosingSymbol(null);
            // Re-enable polling after a short delay so the backend state catches up
            setTimeout(() => { isManualClosing.current = false; }, 5000);
        }
    };

    // P&L milestone detection — trigger confetti
    useEffect(() => {
        const milestones = [100, 500, 1000, 5000];
        const realized = Math.abs(pnl.realized);
        for (const m of milestones) {
            if (realized >= m && !milestonesHit.current.has(m)) {
                milestonesHit.current.add(m);
                setConfettiTrigger(prev => prev + 1);
                setToasts(t => [...t, {
                    id: `milestone-${m}-${Date.now()}`,
                    message: `🎉 MILESTONE: ${pnl.realized >= 0 ? '+' : '-'}$${m} P&L reached!`,
                    type: pnl.realized >= 0 ? 'close-win' : 'close-loss',
                    timestamp: Date.now(),
                }]);
            }
        }
    }, [pnl.realized]);

    // Toast cleanup — remove after 4s
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => Date.now() - t.timestamp < 4000));
        }, 4000);
        return () => clearTimeout(timer);
    }, [toasts]);

    return (
        <PageContainer>
            <div className={styles.terminal}>
                {/* ── Top Bar ── */}
                <div className={styles.topBar}>
                    <Link href="/monolith" className={styles.backBtn}>← OPS</Link>
                    <div className={styles.topRight}>
                        <span className={`${styles.connectionDot} ${engineOnline ? styles.connectionLive : ''}`} />
                        <span className={styles.clockText}>{clock}</span>
                    </div>
                </div>

                {/* ── Sports Market Ticker ── */}
                <div className={styles.tickerBar}>

                    {/* ── Error Banner ── */}
                    {pollError && (
                        <div className={styles.errorBanner}>
                            <span>⚠ {pollError}</span>
                            <span className={styles.errorRetry}>Retrying every 5s...</span>
                        </div>
                    )}
                    {prices.map(p => (
                        <div key={p.symbol} className={styles.tickerCard}>
                            <div className={styles.tickerCardTop}>
                                <div className={styles.tickerCardLeft}>
                                    <span className={styles.tickerLabel}>{p.label}</span>
                                    <span className={styles.tickerPrice}>
                                        {p.price} event{p.price !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className={styles.tickerCardRight}>
                                    <span className={`${styles.tickerChange} ${p.change24h > 0 ? styles.positive : ''}`}>
                                        {p.change24h > 0 ? `${p.change24h} signal${p.change24h !== 1 ? 's' : ''}` : 'No signals'}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.tickerRangeRow}>
                                <span className={styles.tickerRangeLabel}>{p.high24h > 0 ? `${p.high24h} live` : 'None live'}</span>
                            </div>
                        </div>
                    ))}
                    {prices.length === 0 && <span className={styles.tickerLoading}>Awaiting schedule from engine...</span>}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    SCOREBOARD — The giant balance display
                   ═══════════════════════════════════════════════════════════ */}
                <div className={styles.scoreboard}>
                    <Particles intensity={positions.length > 0 ? 'active' : 'idle'} />
                    <div className={styles.scoreLeft}>
                        <div className={styles.scoreLabel}>PORTFOLIO VALUE</div>
                        <div className={`${styles.scoreBalance} ${pnlFlash === 'up' ? styles.flashGreen : pnlFlash === 'down' ? styles.flashRed : ''}`}>
                            <AnimatedNumber value={aum} prefix="$" decimals={2} />
                        </div>
                        <div className={styles.scoreRow}>
                            <span className={styles.scoreStat}>
                                <span className={styles.scoreStatLabel}>P&L</span>
                                <span style={{ color: pnlColor(totalPnl) }}>{formatMoney(totalPnl, true)}</span>
                            </span>
                            <span className={styles.scoreStat}>
                                <span className={styles.scoreStatLabel}>DAILY</span>
                                <span style={{ color: pnlColor(pnl.daily) }}>{pnl.daily >= 0 ? '+' : ''}{pnl.daily.toFixed(2)}%</span>
                            </span>
                            <span className={styles.scoreStat}>
                                <span className={styles.scoreStatLabel}>FEES</span>
                                <span className={styles.neutral}>${pnl.total_fees.toFixed(2)}</span>
                            </span>
                            <span className={styles.scoreStat}>
                                <span className={styles.scoreStatLabel}>TRADES</span>
                                <span className={styles.neutral}>{pnl.closed_trades}</span>
                            </span>
                            {trades.length > 0 && (
                                <span className={styles.scoreStat}>
                                    <span className={styles.scoreStatLabel}>WIN RATE</span>
                                    <span style={{ color: winRate >= 50 ? '#00ff88' : '#ff4466' }}>{winRate}% ({winCount}W/{lossCount}L)</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={styles.scoreRight}>
                        <div className={styles.scoreChartLabel}>EQUITY CURVE</div>
                        <Sparkline data={equityHistory} color={totalPnl >= 0 ? '#00ff88' : '#ff4466'} width={240} height={60} />
                        <div className={styles.scoreEngineStatus}>
                            <span className={`${styles.engineDot} ${engineOnline ? styles.engineDotLive : ''}`} />
                            <span>{engineOnline ? 'ENGINE ONLINE' : 'ENGINE OFFLINE'}</span>
                            <span className={styles.uptimeText}>{uptimeStr}</span>
                        </div>
                    </div>
                </div>

                {/* ── Confetti ── */}
                <ConfettiBurst trigger={confettiTrigger} />

                {/* ── Daily Summary Strip ── */}
                <div className={styles.dailySummary}>
                    <div className={styles.dailyStat}>
                        <span className={styles.dailyStatLabel}>TODAY</span>
                        <span className={styles.dailyStatValue}>{pnl.closed_trades} trades</span>
                    </div>
                    <div className={styles.dailyStat}>
                        <span className={styles.dailyStatLabel}>SESSION P&L</span>
                        <span className={styles.dailyStatValue} style={{ color: pnlColor(pnl.realized) }}>
                            {formatMoney(pnl.realized, true)}
                        </span>
                    </div>
                    <div className={styles.dailyStat}>
                        <span className={styles.dailyStatLabel}>WIN RATE</span>
                        <span className={styles.dailyStatValue} style={{ color: winRate >= 50 ? '#00ff88' : '#ff4466' }}>
                            {winRate}%
                        </span>
                    </div>
                    <div className={styles.dailyStat}>
                        <span className={styles.dailyStatLabel}>RISK</span>
                        <div className={styles.riskMeter}>
                            <div className={styles.riskTrack}>
                                <div
                                    className={styles.riskFill}
                                    style={{
                                        width: `${Math.min(positions.length * 33, 100)}%`,
                                        background: positions.length <= 1 ? '#00ff88'
                                            : positions.length <= 2 ? '#ffbd2e'
                                                : '#ff4466',
                                    }}
                                />
                            </div>
                            <span className={styles.riskLabel}>
                                {positions.length === 0 ? 'NONE'
                                    : positions.length <= 1 ? 'LOW'
                                        : positions.length <= 2 ? 'MED'
                                            : 'HIGH'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    MAIN BODY — Positions (left) + Trades (right)
                   ═══════════════════════════════════════════════════════════ */}
                <div className={styles.mainBody}>

                    {/* ═══════════════════════════════════════════════════
                        🎯 BETTING SIGNALS — What to bet on RIGHT NOW
                       ═══════════════════════════════════════════════════ */}
                    <div className={styles.panel} style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelTitle}>🎯 BETTING SIGNALS — WHAT TO BET ON</span>
                            <span className={styles.panelCount}>{signals.length} signal{signals.length !== 1 ? 's' : ''} today</span>
                        </div>
                        <div className={styles.panelScroll}>
                            {signals.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyPulse} />
                                    <span className={styles.emptyText}>Scanning markets for edges...</span>
                                    <span className={styles.emptySub}>
                                        {engineOnline ? 'Engine is analyzing live Kalshi markets' : 'Engine is offline — no signals'}
                                    </span>
                                </div>
                            ) : (
                                signals.sort((a, b) => b.edge_pct - a.edge_pct).map((sig) => {
                                    const sportEmoji: Record<string, string> = { nba: '🏀', soccer: '⚽', cfb: '🏈', nfl: '🏈' };
                                    const confColor = sig.confidence === 'HIGH' ? '#00ff88' : sig.confidence === 'MEDIUM' ? '#ffbd2e' : '#ff4466';
                                    return (
                                        <div
                                            key={sig.signal_id}
                                            style={{
                                                background: 'rgba(0,255,136,0.04)',
                                                border: '1px solid rgba(0,255,136,0.15)',
                                                borderRadius: '8px',
                                                padding: '14px 16px',
                                                marginBottom: '10px',
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {/* Edge badge */}
                                            <div style={{
                                                position: 'absolute', top: '10px', right: '12px',
                                                background: sig.edge_pct >= 5 ? 'rgba(0,255,136,0.2)' : 'rgba(255,189,46,0.2)',
                                                border: `1px solid ${sig.edge_pct >= 5 ? '#00ff88' : '#ffbd2e'}`,
                                                borderRadius: '6px', padding: '2px 10px',
                                                fontSize: '14px', fontWeight: 700,
                                                color: sig.edge_pct >= 5 ? '#00ff88' : '#ffbd2e',
                                            }}>
                                                +{sig.edge_pct.toFixed(1)}% EDGE
                                            </div>

                                            {/* Event name + sport */}
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px', paddingRight: '100px' }}>
                                                {sportEmoji[sig.sport] || '🎲'} {sig.event}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                                                {sig.league} • {sig.model_source}
                                            </div>

                                            {/* Key stats row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', fontSize: '12px' }}>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>BET</div>
                                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{sig.selection}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>OUR PROB</div>
                                                    <div style={{ color: '#00ff88', fontWeight: 700, fontSize: '13px' }}>{(sig.model_prob * 100).toFixed(0)}%</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>MARKET</div>
                                                    <div style={{ color: '#ff4466', fontWeight: 700, fontSize: '13px' }}>{(sig.market_prob * 100).toFixed(0)}%</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>STAKE</div>
                                                    <div style={{ color: '#ffbd2e', fontWeight: 700, fontSize: '13px' }}>${sig.recommended_size_usd.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>CONFIDENCE</div>
                                                    <div style={{ color: confColor, fontWeight: 700, fontSize: '13px' }}>{sig.confidence}</div>
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: sig.status === 'PLACED' ? 'rgba(0,255,136,0.15)' : 'rgba(255,189,46,0.15)',
                                                    color: sig.status === 'PLACED' ? '#00ff88' : '#ffbd2e',
                                                    border: `1px solid ${sig.status === 'PLACED' ? 'rgba(0,255,136,0.3)' : 'rgba(255,189,46,0.3)'}`,
                                                }}>
                                                    {sig.status === 'PLACED' ? '✓ PLACED' : '⏳ PENDING'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                                                    {sig.contracts} contracts @ {(sig.entry_price * 100).toFixed(0)}¢
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {/* Capital summary footer */}
                        {capitalData && (
                            <div style={{
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                padding: '10px 14px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '8px',
                                fontSize: '11px',
                            }}>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>BANKROLL</div>
                                    <div style={{ color: '#fff', fontWeight: 700 }}>${capitalData.total.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>DEPLOYABLE</div>
                                    <div style={{ color: '#00ff88', fontWeight: 700 }}>${capitalData.deployable.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>DEPLOYED</div>
                                    <div style={{ color: '#ffbd2e', fontWeight: 700 }}>${capitalData.deployed.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>RESERVE</div>
                                    <div style={{ color: '#fff', fontWeight: 700 }}>{capitalData.reserve_pct}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── OPEN POSITIONS ── */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelTitle}>◈ OPEN POSITIONS</span>
                            <span className={styles.panelCount}>{positions.length} active</span>
                        </div>
                        <div className={styles.panelScroll}>
                            {positions.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyPulse} />
                                    <span className={styles.emptyText}>Waiting for entry signals...</span>
                                    <span className={styles.emptySub}>
                                        {engineOnline ? 'Engine is scanning markets every 10s' : 'Engine is offline'}
                                    </span>
                                </div>
                            ) : (
                                positions.map((pos, i) => {
                                    const pnlPct = pos.entry_price > 0 ? ((pos.current_price - pos.entry_price) / pos.entry_price) * 100 * (pos.side === 'long' ? 1 : -1) : 0;
                                    const delta = positionPnlDelta[pos.symbol] ?? 'none';
                                    const tpProgress = Math.min(Math.max(pnlPct / 0.3, 0), 1) * 100;
                                    const slProgress = Math.min(Math.max(Math.abs(pnlPct) / 0.2, 0), 1) * 100;
                                    const isProfit = pnlPct >= 0;
                                    return (
                                        <div key={`${pos.symbol}-${i}`} className={`${styles.positionCard} ${pos.unrealized_pnl >= 0 ? styles.posCardGreen : styles.posCardRed} ${delta === 'up' ? styles.posGlowUp : delta === 'down' ? styles.posGlowDown : ''}`}>
                                            <div className={styles.posHeader}>
                                                <div className={styles.posAsset}>
                                                    <span className={`${styles.posSide} ${pos.side === 'long' ? styles.sideLong : styles.sideShort}`}>
                                                        {pos.side.toUpperCase()}
                                                    </span>
                                                    <span className={styles.posSymbol}>{pos.symbol}</span>
                                                </div>
                                                <div className={styles.posPnl} style={{ color: pnlColor(pos.unrealized_pnl) }}>
                                                    {formatMoney(pos.unrealized_pnl, true)}
                                                    <span className={styles.posPnlPct}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(3)}%</span>
                                                </div>
                                            </div>
                                            <div className={styles.posDetails}>
                                                <div className={styles.posDetail}>
                                                    <span className={styles.posDetailLabel}>Entry</span>
                                                    <span>{formatPrice(pos.entry_price)}</span>
                                                </div>
                                                <div className={styles.posDetail}>
                                                    <span className={styles.posDetailLabel}>Current</span>
                                                    <span style={{ color: pnlColor(pos.unrealized_pnl) }}>{formatPrice(pos.current_price)}</span>
                                                </div>
                                                <div className={styles.posDetail}>
                                                    <span className={styles.posDetailLabel}>Size</span>
                                                    <span>${(pos.size * pos.entry_price).toFixed(0)}</span>
                                                </div>
                                                <div className={styles.posDetail}>
                                                    <span className={styles.posDetailLabel}>Time Held</span>
                                                    <span className={styles.timeHeld}>
                                                        {pos.entry_time ? <TimeHeld since={pos.entry_time} /> : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* TP/SL Gauge */}
                                            <div className={styles.tpSlGauge}>
                                                <div className={styles.tpSlLabels}>
                                                    <span className={styles.slLabel}>SL -0.2%</span>
                                                    <span className={styles.tpSlCenter}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(3)}%</span>
                                                    <span className={styles.tpLabel}>TP +0.3%</span>
                                                </div>
                                                <div className={styles.tpSlTrack}>
                                                    {isProfit ? (
                                                        <div className={styles.tpFill} style={{ width: `${tpProgress}%` }} />
                                                    ) : (
                                                        <div className={styles.slFill} style={{ width: `${slProgress}%` }} />
                                                    )}
                                                </div>
                                            </div>
                                            {/* Close Position Button */}
                                            <button
                                                className={`${styles.closeBtn} ${closingSymbol === pos.symbol ? styles.closeBtnLoading : ''}`}
                                                onClick={() => handleClosePosition(pos.symbol)}
                                                disabled={closingSymbol !== null}
                                                title={`Close ${pos.symbol} at market`}
                                            >
                                                {closingSymbol === pos.symbol ? (
                                                    <span className={styles.closeBtnSpinner} />
                                                ) : (
                                                    <>✕ CLOSE</>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ── TRADE HISTORY ── */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelTitle}>◈ TRADE HISTORY</span>
                            <div className={styles.tradeCounterGroup}>
                                {trades.length > 0 && (
                                    <span className={styles.tradeCounterBadge}>
                                        {trades.filter(t => (t.pnl ?? 0) > 0).length}W / {trades.filter(t => (t.pnl ?? 0) < 0).length}L
                                    </span>
                                )}
                                <span className={styles.panelCount}>{trades.length} closed</span>
                            </div>
                        </div>
                        <div className={styles.panelScroll}>
                            {trades.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyPulse} />
                                    <span className={styles.emptyText}>No closed trades yet</span>
                                    <span className={styles.emptySub}>
                                        Trades will appear here when positions hit TP or SL
                                    </span>
                                </div>
                            ) : (
                                <>
                                    {trades.map((t, idx) => (
                                        <div
                                            key={t.id}
                                            className={`${styles.tradeCard} ${(t.pnl ?? 0) >= 0 ? styles.tradeCardWin : styles.tradeCardLoss} ${idx === 0 ? styles.tradeSpotlight : ''}`}
                                        >
                                            {idx === 0 && <div className={styles.spotlightLabel}>LATEST</div>}
                                            <div className={styles.tradeCardTop}>
                                                <div className={styles.tradeCardAsset}>
                                                    <span className={`${styles.posSide} ${t.side === 'long' ? styles.sideLong : styles.sideShort}`}>
                                                        {t.side.toUpperCase()}
                                                    </span>
                                                    <span className={styles.tradeCardSymbol}>{t.asset}</span>
                                                </div>
                                                <div className={styles.tradeCardPnl} style={{ color: pnlColor(t.pnl ?? 0) }}>
                                                    {formatMoney(t.pnl ?? 0, true)}
                                                    {t.pnlPercent != null && (
                                                        <span className={styles.tradeCardPnlPct}>
                                                            {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.tradeCardBottom}>
                                                <span>{formatPrice(t.entryPrice)} → {t.exitPrice ? formatPrice(t.exitPrice) : '—'}</span>
                                                <span className={styles.tradeCardSize}>${t.size?.toFixed(0) ?? '—'}</span>
                                                <span className={styles.tradeCardTime}>{formatTime(t.timestamp)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                        {/* Running Total P&L Footer */}
                        {trades.length > 0 && (
                            <div className={styles.tradeFooter}>
                                <div className={styles.tradeFooterRow}>
                                    <span>Total Realized</span>
                                    <span style={{ color: pnlColor(pnl.realized) }}>{formatMoney(pnl.realized, true)}</span>
                                </div>
                                <div className={styles.tradeFooterRow}>
                                    <span>Total Fees</span>
                                    <span className={styles.neutral}>-${pnl.total_fees.toFixed(2)}</span>
                                </div>
                                <div className={`${styles.tradeFooterRow} ${styles.tradeFooterTotal}`}>
                                    <span>Net P&L</span>
                                    <span style={{ color: pnlColor(pnl.realized - pnl.total_fees) }}>
                                        {formatMoney(pnl.realized - pnl.total_fees, true)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── ENGINE + INDICATORS ── */}
                    <div className={styles.panel} style={{ maxWidth: '280px' }}>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelTitle}>◈ ENGINE</span>
                            <span className={styles.panelCount}>{lastUpdate ? `Updated ${lastUpdate}` : '...'}</span>
                        </div>
                        <div className={styles.panelScroll}>
                            {!health ? (
                                /* Loading Skeleton */
                                <div className={styles.skeleton}>
                                    <div className={styles.skeletonLine} style={{ width: '80%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '60%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '90%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '50%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '70%' }} />
                                </div>
                            ) : (
                                <div className={styles.engineStats}>
                                    {/* Scan Countdown */}
                                    <div className={styles.scanCountdown}>
                                        <div className={styles.scanCountdownHeader}>
                                            <span className={styles.scanDots}>
                                                <span className={styles.scanDot} style={{ animationDelay: '0s' }} />
                                                <span className={styles.scanDot} style={{ animationDelay: '0.2s' }} />
                                                <span className={styles.scanDot} style={{ animationDelay: '0.4s' }} />
                                            </span>
                                            <span>Next scan in {scanCountdown}s</span>
                                        </div>
                                        <div className={styles.scanBar}>
                                            <div className={styles.scanBarFill} style={{ width: `${((10 - scanCountdown) / 10) * 100}%` }} />
                                        </div>
                                    </div>

                                    {/* Market Regime */}
                                    <div className={styles.engineStatRow}>
                                        <span>Regime</span>
                                        <span className={
                                            regime === 'trending' ? styles.regimeTrending
                                                : regime === 'volatile' ? styles.regimeVolatile
                                                    : styles.regimeRanging
                                        }>
                                            {regime === 'trending' ? '🟢 TRENDING'
                                                : regime === 'volatile' ? '🔴 VOLATILE'
                                                    : '🟡 RANGING'}
                                        </span>
                                    </div>

                                    {/* Connection Heartbeat */}
                                    <div className={styles.engineStatRow}>
                                        <span>Connection</span>
                                        <span className={styles.heartbeat}>
                                            <span className={styles.heartbeatDot} />
                                            {engineOnline ? 'LIVE' : 'OFFLINE'}
                                        </span>
                                    </div>

                                    <div className={styles.engineStatRow}>
                                        <span>Status</span>
                                        <span className={styles.positive}>{health.status.toUpperCase()}</span>
                                    </div>
                                    <div className={styles.engineStatRow}>
                                        <span>Mode</span>
                                        <span className={styles.paperBadge}>PAPER</span>
                                    </div>
                                    <div className={styles.engineStatRow}>
                                        <span>Strategies</span>
                                        <span>{health.strategies_active ?? 0} active</span>
                                    </div>
                                    {health.exchanges?.map(ex => (
                                        <div key={ex.name} className={styles.engineStatRow}>
                                            <span>{ex.name}</span>
                                            <span className={ex.status === 'connected' ? styles.positive : styles.negative}>
                                                {ex.status}
                                            </span>
                                        </div>
                                    ))}
                                    {health.system && (
                                        <>
                                            <div className={styles.engineStatRow}>
                                                <span>CPU</span>
                                                <span>{health.system.cpu_percent?.toFixed(0)}%</span>
                                            </div>
                                            <div className={styles.engineStatRow}>
                                                <span>Memory</span>
                                                <span>{health.system.memory_percent?.toFixed(0)}%</span>
                                            </div>
                                        </>
                                    )}
                                    <div className={styles.engineStatRow}>
                                        <span>Uptime</span>
                                        <span>{uptimeStr}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Toast Notifications ── */}
            {toasts.length > 0 && (
                <div className={styles.toastContainer}>
                    {toasts.map(t => (
                        <div
                            key={t.id}
                            className={`${styles.toast} ${t.type === 'open' ? styles.toastOpen
                                : t.type === 'close-win' ? styles.toastWin
                                    : styles.toastLoss
                                }`}
                        >
                            {t.message}
                        </div>
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
