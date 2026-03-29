'use client';

import { useState, useMemo } from 'react';
import { HoloPanel } from './HoloPanel';
import styles from './EquityCurve.module.css';

interface DataPoint {
    date: string;
    nav: number;
}

interface EquityCurveProps {
    data: DataPoint[];
    /** Initial NAV (for calculating returns) */
    initialNav?: number;
    header?: string;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const RANGE_DAYS: Record<TimeRange, number> = {
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    'ALL': Infinity,
};

/**
 * EquityCurve — SVG line chart of fund NAV over time.
 * Features: time range selector, high-water mark overlay, drawdown shading.
 */
export function EquityCurve({ data, initialNav = 100, header = 'EQUITY CURVE' }: EquityCurveProps) {
    const [range, setRange] = useState<TimeRange>('ALL');
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    const filtered = useMemo(() => {
        if (range === 'ALL' || data.length === 0) return data;
        const days = RANGE_DAYS[range];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return data.filter((d) => d.date >= cutoffStr);
    }, [data, range]);

    // Chart dimensions
    const W = 600;
    const H = 200;
    const PAD = { top: 10, right: 10, bottom: 20, left: 50 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    // Scales
    const navValues = filtered.map((d) => d.nav);
    const minNav = Math.min(...navValues) * 0.995;
    const maxNav = Math.max(...navValues) * 1.005;
    const navRange = maxNav - minNav || 1;

    const toX = (i: number) => PAD.left + (i / Math.max(filtered.length - 1, 1)) * plotW;
    const toY = (nav: number) => PAD.top + plotH - ((nav - minNav) / navRange) * plotH;

    // Build paths
    const linePath = filtered.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.nav)}`).join(' ');

    // High-water mark
    const hwmPoints = useMemo(() => {
        let peak = 0;
        return filtered.map((d) => {
            peak = Math.max(peak, d.nav);
            return peak;
        });
    }, [filtered]);
    const hwmPath = hwmPoints.map((h, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(h)}`).join(' ');

    // Drawdown fill area (between HWM and NAV when NAV < HWM)
    const drawdownPath = useMemo(() => {
        if (filtered.length < 2) return '';
        let path = `M${toX(0)},${toY(hwmPoints[0])}`;
        for (let i = 0; i < filtered.length; i++) {
            path += ` L${toX(i)},${toY(hwmPoints[i])}`;
        }
        for (let i = filtered.length - 1; i >= 0; i--) {
            path += ` L${toX(i)},${toY(filtered[i].nav)}`;
        }
        path += ' Z';
        return path;
    }, [filtered, hwmPoints, toX, toY]);

    // Hover data
    const hoverData = hoverIdx !== null && filtered[hoverIdx] ? filtered[hoverIdx] : null;
    const hoverReturn = hoverData ? ((hoverData.nav / initialNav - 1) * 100).toFixed(2) : null;

    return (
        <HoloPanel size="lg" depth="mid" header={header}>
            {/* Time range selector */}
            <div className={styles.rangeBar}>
                {(Object.keys(RANGE_DAYS) as TimeRange[]).map((r) => (
                    <button
                        key={r}
                        className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
                        onClick={() => setRange(r)}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Hover tooltip */}
            {hoverData && (
                <div className={styles.tooltip}>
                    <span className={styles.tooltipDate}>{hoverData.date}</span>
                    <span className={styles.tooltipNav}>NAV: ${hoverData.nav.toFixed(2)}</span>
                    <span className={styles.tooltipReturn} style={{ color: Number(hoverReturn) >= 0 ? '#28ca41' : '#ff4d6a' }}>
                        {Number(hoverReturn) >= 0 ? '+' : ''}{hoverReturn}%
                    </span>
                </div>
            )}

            {/* SVG Chart */}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className={styles.chart}
                onMouseLeave={() => setHoverIdx(null)}
            >
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const val = minNav + pct * navRange;
                    const y = toY(val);
                    return (
                        <g key={pct}>
                            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(0,255,255,0.06)" strokeWidth="0.5" />
                            <text x={PAD.left - 6} y={y + 3} className={styles.axisLabel} textAnchor="end">
                                ${val.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {/* Drawdown fill */}
                {drawdownPath && (
                    <path d={drawdownPath} fill="rgba(255, 77, 106, 0.08)" />
                )}

                {/* High-water mark */}
                <path d={hwmPath} fill="none" stroke="rgba(0,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />

                {/* NAV line */}
                <path d={linePath} fill="none" stroke="rgba(0,255,255,0.6)" strokeWidth="1.5" />

                {/* Hover hit areas */}
                {filtered.map((_, i) => (
                    <rect
                        key={i}
                        x={toX(i) - plotW / filtered.length / 2}
                        y={PAD.top}
                        width={plotW / filtered.length}
                        height={plotH}
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(i)}
                    />
                ))}

                {/* Hover crosshair */}
                {hoverIdx !== null && filtered[hoverIdx] && (
                    <>
                        <line
                            x1={toX(hoverIdx)} y1={PAD.top}
                            x2={toX(hoverIdx)} y2={PAD.top + plotH}
                            stroke="rgba(0,255,255,0.3)" strokeWidth="0.5" strokeDasharray="3 3"
                        />
                        <circle cx={toX(hoverIdx)} cy={toY(filtered[hoverIdx].nav)} r="3" fill="#0ff" />
                    </>
                )}
            </svg>

            {/* Legend */}
            <div className={styles.legend}>
                <span className={styles.legendItem}><span className={styles.legendLine} /> NAV</span>
                <span className={styles.legendItem}><span className={styles.legendDash} /> High-Water Mark</span>
                <span className={styles.legendItem}><span className={styles.legendFill} /> Drawdown</span>
            </div>
        </HoloPanel>
    );
}
