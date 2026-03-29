'use client';

import { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { CRT_CHART_COLORS, CRT_AXIS_STYLE, CRT_TOOLTIP_STYLE, CRT_GRID_STYLE } from './chartTheme';
import type { EquityDataPoint, TimeRange } from '@/lib/mockPerformanceData';

/* ─── Benchmark config ─── */
const BENCHMARKS = [
    { key: 'btc', label: 'BTC', color: CRT_CHART_COLORS.amber },
    { key: 'eth', label: 'ETH', color: CRT_CHART_COLORS.purple },
    { key: 'sp500', label: 'S&P 500', color: CRT_CHART_COLORS.dim },
] as const;

const TIME_RANGES: TimeRange[] = ['7D', '30D', '90D', 'YTD', 'ALL'];

interface EquityCurveChartProps {
    data: EquityDataPoint[];
    height?: number;
    onRangeChange?: (range: TimeRange) => void;
    activeRange?: TimeRange;
}

export function EquityCurveChart({
    data,
    height = 360,
    onRangeChange,
    activeRange = '90D',
}: EquityCurveChartProps) {
    const [visibleBenchmarks, setVisibleBenchmarks] = useState<Set<string>>(new Set());

    const toggleBenchmark = (key: string) => {
        setVisibleBenchmarks((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    /* Format X-axis date labels */
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    /* Custom tooltip */
    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
        if (!active || !payload) return null;
        return (
            <div
                style={{
                    background: 'rgba(3, 3, 8, 0.95)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.65rem',
                    padding: '8px 12px',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '4px',
                }}
            >
                <div style={{ color: 'rgba(224, 224, 232, 0.5)', marginBottom: 4 }}>{label}</div>
                {payload.map((entry) => (
                    <div key={entry.dataKey} style={{ color: entry.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        <span>{entry.dataKey === 'equity' ? 'Vault' : entry.dataKey.toUpperCase()}</span>
                        <span>{entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)}%</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div>
            {/* Controls row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                {/* Time range toggle */}
                <div style={{ display: 'flex', gap: 2 }}>
                    {TIME_RANGES.map((range) => (
                        <button
                            key={range}
                            onClick={() => onRangeChange?.(range)}
                            style={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.65rem',
                                letterSpacing: '0.1em',
                                padding: '6px 14px',
                                border: `1px solid ${activeRange === range ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 240, 255, 0.1)'}`,
                                borderRadius: 4,
                                background: activeRange === range ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                                color: activeRange === range ? CRT_CHART_COLORS.cyan : CRT_CHART_COLORS.dim,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Benchmark toggles */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {BENCHMARKS.map((bm) => (
                        <button
                            key={bm.key}
                            onClick={() => toggleBenchmark(bm.key)}
                            style={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '0.6rem',
                                letterSpacing: '0.08em',
                                padding: '5px 10px',
                                border: `1px solid ${visibleBenchmarks.has(bm.key) ? bm.color + '66' : 'rgba(224, 224, 232, 0.1)'}`,
                                borderRadius: 4,
                                background: visibleBenchmarks.has(bm.key) ? bm.color + '15' : 'transparent',
                                color: visibleBenchmarks.has(bm.key) ? bm.color : CRT_CHART_COLORS.dim,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {bm.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CRT_CHART_COLORS.cyan} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={CRT_CHART_COLORS.cyan} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid {...CRT_GRID_STYLE} />
                    <XAxis
                        dataKey="date"
                        {...CRT_AXIS_STYLE}
                        tickFormatter={formatDate}
                        interval="preserveStartEnd"
                        minTickGap={40}
                    />
                    <YAxis
                        {...CRT_AXIS_STYLE}
                        tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Benchmark areas (behind main) */}
                    {BENCHMARKS.map((bm) =>
                        visibleBenchmarks.has(bm.key) ? (
                            <Area
                                key={bm.key}
                                type="monotone"
                                dataKey={bm.key}
                                stroke={bm.color}
                                strokeWidth={1}
                                fill="none"
                                dot={false}
                                activeDot={{ r: 3, fill: bm.color, stroke: 'none' }}
                            />
                        ) : null
                    )}

                    {/* Main equity line */}
                    <Area
                        type="monotone"
                        dataKey="equity"
                        stroke={CRT_CHART_COLORS.cyan}
                        strokeWidth={2}
                        fill="url(#equityGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: CRT_CHART_COLORS.cyan, stroke: 'none' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
