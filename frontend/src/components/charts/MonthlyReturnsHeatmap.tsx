'use client';

import { useState } from 'react';
import type { MonthlyReturn } from '@/lib/mockPerformanceData';
import { MONTH_LABELS } from '@/lib/mockPerformanceData';

interface MonthlyReturnsHeatmapProps {
    data: MonthlyReturn[];
    className?: string;
}

function getCellColor(value: number): string {
    if (value === 0) return 'rgba(224, 224, 232, 0.05)';
    const intensity = Math.min(Math.abs(value) / 8, 1);
    if (value > 0) {
        return `rgba(0, 255, 65, ${0.08 + intensity * 0.35})`;
    }
    return `rgba(255, 59, 59, ${0.08 + intensity * 0.35})`;
}

function getCellTextColor(value: number): string {
    if (value === 0) return 'rgba(224, 224, 232, 0.3)';
    const intensity = Math.min(Math.abs(value) / 8, 1);
    if (value > 0) {
        return `rgba(0, 255, 65, ${0.5 + intensity * 0.5})`;
    }
    return `rgba(255, 59, 59, ${0.5 + intensity * 0.5})`;
}

export function MonthlyReturnsHeatmap({ data, className = '' }: MonthlyReturnsHeatmapProps) {
    const [hoveredCell, setHoveredCell] = useState<{ year: number; month: number } | null>(null);

    /* Group data by year */
    const years = [...new Set(data.map((d) => d.year))].sort();

    const getReturn = (year: number, month: number): MonthlyReturn | undefined => {
        return data.find((d) => d.year === year && d.month === month);
    };

    /* Yearly total */
    const getYearTotal = (year: number): number => {
        const yearData = data.filter((d) => d.year === year);
        return yearData.reduce((sum, d) => sum + d.value, 0);
    };

    return (
        <div className={className}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto repeat(12, 1fr) auto',
                    gap: 2,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.6rem',
                }}
            >
                {/* Month headers */}
                <div style={{ padding: '6px 8px', color: 'rgba(224, 224, 232, 0.25)', textAlign: 'center' }}></div>
                {MONTH_LABELS.map((m) => (
                    <div
                        key={m}
                        style={{
                            padding: '6px 0',
                            color: 'rgba(224, 224, 232, 0.3)',
                            textAlign: 'center',
                            letterSpacing: '0.08em',
                        }}
                    >
                        {m}
                    </div>
                ))}
                <div
                    style={{
                        padding: '6px 8px',
                        color: 'rgba(0, 240, 255, 0.4)',
                        textAlign: 'center',
                        letterSpacing: '0.08em',
                    }}
                >
                    YTD
                </div>

                {/* Data rows */}
                {years.map((year) => {
                    const yearTotal = getYearTotal(year);
                    return (
                        <div key={year} style={{ display: 'contents' }}>
                            {/* Year label */}
                            <div
                                style={{
                                    padding: '8px 10px',
                                    color: 'rgba(224, 224, 232, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    letterSpacing: '0.08em',
                                    fontWeight: 600,
                                }}
                            >
                                {year}
                            </div>

                            {/* Month cells */}
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                const entry = getReturn(year, month);
                                const isHovered = hoveredCell?.year === year && hoveredCell?.month === month;
                                return (
                                    <div
                                        key={month}
                                        onMouseEnter={() => setHoveredCell({ year, month })}
                                        onMouseLeave={() => setHoveredCell(null)}
                                        style={{
                                            padding: '8px 4px',
                                            textAlign: 'center',
                                            background: entry ? getCellColor(entry.value) : 'rgba(224, 224, 232, 0.02)',
                                            color: entry ? getCellTextColor(entry.value) : 'rgba(224, 224, 232, 0.15)',
                                            borderRadius: 3,
                                            cursor: entry ? 'default' : 'default',
                                            border: isHovered && entry
                                                ? '1px solid rgba(0, 240, 255, 0.3)'
                                                : '1px solid transparent',
                                            transition: 'border-color 0.15s, background 0.15s',
                                            position: 'relative',
                                            minWidth: 0,
                                        }}
                                    >
                                        {entry ? `${entry.value > 0 ? '+' : ''}${entry.value.toFixed(1)}%` : '—'}

                                        {/* Tooltip */}
                                        {isHovered && entry && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '110%',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    background: 'rgba(3, 3, 8, 0.95)',
                                                    border: '1px solid rgba(0, 240, 255, 0.2)',
                                                    padding: '6px 10px',
                                                    borderRadius: 4,
                                                    whiteSpace: 'nowrap',
                                                    zIndex: 10,
                                                    backdropFilter: 'blur(8px)',
                                                    fontSize: '0.6rem',
                                                    color: getCellTextColor(entry.value),
                                                }}
                                            >
                                                {MONTH_LABELS[month - 1]} {year}: {entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)}%
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Year total */}
                            <div
                                style={{
                                    padding: '8px 10px',
                                    textAlign: 'center',
                                    color: getCellTextColor(yearTotal),
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {yearTotal > 0 ? '+' : ''}{yearTotal.toFixed(1)}%
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
