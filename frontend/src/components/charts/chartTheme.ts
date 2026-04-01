/* ══════════════════════════════════════════════════════════════
   CHART THEME — Institutional Color Palette
   ══════════════════════════════════════════════════════════════ */

export const CRT_CHART_COLORS = {
    cyan: '#f4f4f5', /* Main platinum curve */
    green: '#d4af37', /* Gold highlights */
    amber: '#8c7324', 
    red: '#ff3366', /* Data negative */
    purple: '#00e5ff', /* Data positive */
    white: '#f4f4f5',
    dim: 'rgba(244, 244, 245, 0.3)',
    gridLine: 'rgba(212, 175, 55, 0.05)',
    background: 'transparent',
} as const;

export const CRT_PALETTE = [
    CRT_CHART_COLORS.cyan,
    CRT_CHART_COLORS.green,
    CRT_CHART_COLORS.amber,
    CRT_CHART_COLORS.red,
    CRT_CHART_COLORS.purple,
] as const;

export const CRT_AXIS_STYLE = {
    stroke: CRT_CHART_COLORS.dim,
    tick: { fill: CRT_CHART_COLORS.dim, fontSize: 10, fontFamily: 'var(--font-mono)' },
    axisLine: { stroke: CRT_CHART_COLORS.gridLine },
    tickLine: { stroke: CRT_CHART_COLORS.gridLine },
} as const;

export const CRT_TOOLTIP_STYLE = {
    contentStyle: {
        background: 'rgba(10, 10, 11, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: CRT_CHART_COLORS.white,
        backdropFilter: 'blur(8px)',
    },
    itemStyle: { color: CRT_CHART_COLORS.cyan },
    cursor: { stroke: CRT_CHART_COLORS.cyan, strokeDasharray: '3 3' },
} as const;

export const CRT_GRID_STYLE = {
    stroke: CRT_CHART_COLORS.gridLine,
    strokeDasharray: '2 4',
} as const;
