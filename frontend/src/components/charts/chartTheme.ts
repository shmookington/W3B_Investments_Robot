/* ══════════════════════════════════════════════════════════════
   CHART THEME — CRT color palette for all charts
   ══════════════════════════════════════════════════════════════ */

/** Shared CRT-themed chart colors */
export const CRT_CHART_COLORS = {
    cyan: '#00f0ff',
    green: '#00ff41',
    amber: '#ffb300',
    red: '#ff3b3b',
    purple: '#9b59b6',
    white: '#e0e0e8',
    dim: 'rgba(224, 224, 232, 0.3)',
    gridLine: 'rgba(0, 240, 255, 0.06)',
    background: 'transparent',
} as const;

/** Palette array for series cycling */
export const CRT_PALETTE = [
    CRT_CHART_COLORS.cyan,
    CRT_CHART_COLORS.green,
    CRT_CHART_COLORS.amber,
    CRT_CHART_COLORS.red,
    CRT_CHART_COLORS.purple,
] as const;

/** Shared axis style props for Recharts */
export const CRT_AXIS_STYLE = {
    stroke: CRT_CHART_COLORS.dim,
    tick: { fill: CRT_CHART_COLORS.dim, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' },
    axisLine: { stroke: CRT_CHART_COLORS.gridLine },
    tickLine: { stroke: CRT_CHART_COLORS.gridLine },
} as const;

/** Shared tooltip style for Recharts */
export const CRT_TOOLTIP_STYLE = {
    contentStyle: {
        background: 'rgba(3, 3, 8, 0.95)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.65rem',
        color: CRT_CHART_COLORS.white,
        backdropFilter: 'blur(8px)',
    },
    itemStyle: { color: CRT_CHART_COLORS.cyan },
    cursor: { stroke: CRT_CHART_COLORS.cyan, strokeDasharray: '3 3' },
} as const;

/** Shared grid props for Recharts */
export const CRT_GRID_STYLE = {
    stroke: CRT_CHART_COLORS.gridLine,
    strokeDasharray: '2 4',
} as const;
